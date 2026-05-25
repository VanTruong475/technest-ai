import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Shield, Mail, Phone, CheckCircle, XCircle, Lock } from "lucide-react";
import { ProfileSkeleton } from "@/components/common/Skeleton";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || "");
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.put(`/api/users/${user!.id}`, {
        full_name: fullName,
        phone: phone || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      toast.success("Cập nhật thông tin thành công!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Cập nhật thất bại");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.put("/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail.map((d: any) => d.msg).join(", "));
      } else {
        toast.error(detail || "Đổi mật khẩu thất bại");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    updateMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải ít nhất 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    passwordMutation.mutate();
  };

  if (!user) {
    return <ProfileSkeleton />;
  }

  // Initials cho avatar — lấy 2 ký tự đầu của họ tên (hoặc 1 ký tự nếu name 1 từ).
  // Fallback "?" khi name rỗng để không bao giờ render avatar trống.
  const initials = (user.full_name || "?")
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase() || "?";

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header với avatar + identity */}
      <Card className="overflow-hidden border-border/60">
        <div className="h-20 bg-gradient-to-r from-primary/80 via-violet-600/80 to-primary/80 dark:from-primary/40 dark:via-violet-600/40 dark:to-primary/40" aria-hidden="true" />
        <CardContent className="pt-0 pb-5 px-5 -mt-10">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-background shrink-0">
              {initials}
            </div>
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
                    ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300"
                    : "text-rose-700 bg-rose-500/10 dark:text-rose-300"
                }`}>
                  {user.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {user.is_active ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: account info readonly */}
        <Card className="lg:col-span-1 h-fit border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Số điện thoại</p>
                <p className="font-medium">{user.phone || <span className="text-muted-foreground italic">Chưa cập nhật</span>}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Shield className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Vai trò</p>
                <p className="font-medium">{user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: edit forms stacked */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit info */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chỉnh sửa thông tin</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Họ tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9"
                        placeholder="Nguyễn Văn A"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9"
                        placeholder="0901234567"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Đổi mật khẩu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current_password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-9"
                      placeholder="Nhập mật khẩu hiện tại"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Mật khẩu mới</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-9"
                        placeholder="Tối thiểu 8 ký tự"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm_password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9"
                        placeholder="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
