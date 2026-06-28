import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/utils/api";

/** Tab "Bảo mật" — đổi mật khẩu. */
export default function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
    onError: (err: unknown) => {
      const detail =
        err instanceof Error && "response" in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).response?.data?.detail
          : undefined;
      if (Array.isArray(detail)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toast.error(detail.map((d: any) => d.msg).join(", "));
      } else {
        toast.error(getErrorMessage(err, "Đổi mật khẩu thất bại"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
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

  return (
    <Card className="border-border/60 max-w-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Đổi mật khẩu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {passwordMutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
