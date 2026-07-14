import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/utils/api";
import type { User as UserType } from "@/types";

/** Tab "Hồ sơ" — form chỉnh sửa; nút Lưu chỉ active khi dirty. */
export default function ProfileInfoTab({ user }: { user: UserType }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.put(`/api/users/${user.id}`, {
        full_name: fullName,
        phone: phone || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      toast.success("Cập nhật thông tin thành công!");
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Cập nhật thất bại")),
  });

  const dirty = fullName !== user.full_name || phone !== (user.phone || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Read-only summary */}
      <Card className="lg:col-span-1 h-fit border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary shrink-0" aria-hidden="true" />
            Tài khoản
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Mail className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium break-all text-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Phone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Số điện thoại</p>
              <p className="font-medium">
                {user.phone || (
                  <span className="text-muted-foreground italic font-normal">Chưa cập nhật</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Vai trò</p>
              <p className="font-medium">{user.role === "ADMIN" ? "Admin" : "Khách hàng"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="lg:col-span-2 border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary shrink-0" aria-hidden="true" />
            Chỉnh sửa thông tin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Họ tên <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
            <Button type="submit" disabled={!dirty || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
