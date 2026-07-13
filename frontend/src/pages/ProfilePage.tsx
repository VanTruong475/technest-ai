import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, CheckCircle, XCircle, User, ShoppingBag, Heart, Lock } from "lucide-react";
import { ProfileSkeleton } from "@/components/common/Skeleton";
import ProfileInfoTab from "@/components/account/ProfileInfoTab";
import SecurityTab from "@/components/account/SecurityTab";
import OrdersTab from "@/components/account/OrdersTab";
import WishlistTab from "@/components/account/WishlistTab";

const VALID_TABS = ["profile", "orders", "wishlist", "security"] as const;
type TabKey = (typeof VALID_TABS)[number];

/** Initials 2 ký tự đầu họ tên cho AvatarFallback (fallback "?" khi rỗng). */
function getInitials(name: string): string {
  return (
    (name || "?")
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(-2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();

  if (!user) {
    return <ProfileSkeleton />;
  }

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = VALID_TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "profile";
  const setTab = (value: string) => setSearchParams({ tab: value }, { replace: true });

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Identity header */}
      <Card className="overflow-hidden border-border/60">
        <div className="h-20 bg-gradient-to-r from-primary/80 via-violet-600/80 to-primary/80 dark:from-primary/40 dark:via-violet-600/40 dark:to-primary/40" aria-hidden="true" />
        <CardContent className="pt-0 pb-5 px-5 -mt-10">
          <div className="flex items-end gap-4 flex-wrap">
            <Avatar className="h-20 w-20 rounded-2xl shadow-lg ring-4 ring-background shrink-0">
              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground text-2xl font-bold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl font-bold truncate">{user.full_name || "Chưa cập nhật"}</h1>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  isAdmin
                    ? "text-violet-700 bg-violet-500/10 dark:text-violet-300"
                    : "text-sky-700 bg-sky-500/10 dark:text-sky-300"
                }`}>
                  <Shield className="h-3 w-3" />
                  {user.role}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.is_active
                    ? "text-success bg-success/10"
                    : "text-destructive bg-destructive/10"
                }`}>
                  {user.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {user.is_active ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        {/* Sticky dưới header trên mobile, tĩnh trên desktop */}
        <div className="sticky top-16 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none">
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-4 w-4" /> Hồ sơ</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5"><ShoppingBag className="h-4 w-4" /> Đơn hàng</TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-1.5"><Heart className="h-4 w-4" /> Wishlist</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Lock className="h-4 w-4" /> Bảo mật</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-6">
          <ProfileInfoTab user={user} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="wishlist" className="mt-6">
          <WishlistTab />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
