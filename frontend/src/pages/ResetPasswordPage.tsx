import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/utils/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ new_password?: string; confirm_password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!newPassword) {
      newErrors.new_password = "Vui lòng nhập mật khẩu mới";
    } else if (newPassword.length < 8) {
      newErrors.new_password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (!confirmPassword) {
      newErrors.confirm_password = "Vui lòng xác nhận mật khẩu";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm_password = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await axiosClient.post("/api/auth/reset-password", {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      toast.success("Đặt lại mật khẩu thành công!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Link không hợp lệ</CardTitle>
            <CardDescription>Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/forgot-password">
              <Button className="w-full h-11 rounded-xl">Yêu cầu link mới</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Thành công!</CardTitle>
            <CardDescription>Mật khẩu đã được đặt lại.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-11 rounded-xl" onClick={() => navigate("/login")}>
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
          <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">Mật khẩu mới</label>
              <Input
                id="new-password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, new_password: undefined })); }}
                className={`h-11 rounded-xl ${errors.new_password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.new_password && <p className="text-xs text-destructive">{errors.new_password}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">Xác nhận mật khẩu</label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirm_password: undefined })); }}
                className={`h-11 rounded-xl ${errors.confirm_password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password}</p>}
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
              {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline">Quay lại đăng nhập</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
