import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/utils/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post("/api/auth/forgot-password", { email });
      setSent(true);
      toast.success("Link đặt lại mật khẩu đã được gửi!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Kiểm tra email</CardTitle>
            <CardDescription>
              Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Link sẽ hết hạn sau 15 phút. Nếu không thấy email, hãy kiểm tra thư mục spam.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setSent(false); setEmail(""); }}>
                Gửi lại
              </Button>
              <Link to="/login" className="flex-1">
                <Button variant="outline" className="w-full">Quay lại đăng nhập</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email để nhận link đặt lại mật khẩu</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className={`h-11 rounded-xl ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi link đặt lại"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Nhớ mật khẩu?{" "}
            <Link to="/login" className="text-primary underline">Đăng nhập</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
