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

/** Initials 2 ký tự cuối họ tên cho AvatarFallback. */
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
      {/* Identity — flag bar + card phẳng (không gradient banner) */}
      <Card className="border-border/60">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-border shrink-0">
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-xl font-bold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="h-4 w-1 rounded-full bg-primary shrink-0" aria-hidden="true" />
                <p className="text-xs font-medium tracking-wide text-muted-foreground">Tài khoản</p>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {user.full_name || "Chưa cập nhật"}
              </h1>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    isAdmin
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground bg-muted"
                  }`}
                >
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  {isAdmin ? "Admin" : "Khách hàng"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.is_active
                      ? "text-success bg-success/10"
                      : "text-destructive bg-destructive/10"
                  }`}
                >
                  {user.is_active ? (
                    <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3 w-3" aria-hidden="true" />
                  )}
                  {user.is_active ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setTab}>
        {/* Sticky dưới fixed header (~128px = h-20 + h-12) */}
        {/* Mobile: sticky dưới header h-20; desktop: tĩnh (category nav chỉ md+) */}
        <div className="sticky top-20 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-0">
          <TabsList className="w-full justify-start overflow-x-auto h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="profile" className="gap-1.5 data-[state=active]:shadow-sm">
              <User className="h-4 w-4" aria-hidden="true" />
              Hồ sơ
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 data-[state=active]:shadow-sm">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Đơn hàng
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-1.5 data-[state=active]:shadow-sm">
              <Heart className="h-4 w-4" aria-hidden="true" />
              Yêu thích
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 data-[state=active]:shadow-sm">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Bảo mật
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-6 focus-visible:outline-none">
          <ProfileInfoTab user={user} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6 focus-visible:outline-none">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="wishlist" className="mt-6 focus-visible:outline-none">
          <WishlistTab />
        </TabsContent>
        <TabsContent value="security" className="mt-6 focus-visible:outline-none">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
