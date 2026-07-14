import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { getErrorMessage } from "@/utils/api";

/** Tab "Bảo mật" — đổi mật khẩu + 2FA (Admin). */
export default function SecurityTab() {
  const user = useAuthStore((s) => s.user);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const isAdmin = user?.role === "ADMIN";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [copied, setCopied] = useState(false);

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

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post("/api/auth/2fa/setup");
      return res.data as { secret: string; otpauth_uri: string };
    },
    onSuccess: (data) => {
      setSetupSecret(data.secret);
      setSetupUri(data.otpauth_uri);
      toast.message("Quét QR hoặc nhập secret vào Authenticator, rồi xác nhận mã.");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể khởi tạo 2FA"));
    },
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.post("/api/auth/2fa/enable", { code: enableCode });
    },
    onSuccess: async () => {
      toast.success("Đã bật xác thực 2 lớp!");
      setSetupSecret(null);
      setSetupUri(null);
      setEnableCode("");
      await fetchCurrentUser();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Mã xác thực không đúng"));
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.post("/api/auth/2fa/disable", {
        password: disablePassword,
        code: disableCode,
      });
    },
    onSuccess: async () => {
      toast.success("Đã tắt 2FA");
      setDisablePassword("");
      setDisableCode("");
      await fetchCurrentUser();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể tắt 2FA"));
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

  const copySecret = async () => {
    if (!setupSecret) return;
    try {
      await navigator.clipboard.writeText(setupSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không copy được. Hãy chọn secret thủ công");
    }
  };

  // QR via public chart API (no extra npm dep). otpauth URI is not a secret long-term once scanned.
  const qrUrl = setupUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupUri)}`
    : null;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Soft-enforce banner — primary family (không amber raw) */}
      {isAdmin && !user?.is_2fa_enabled && (
        <div
          role="status"
          className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
        >
          <p className="font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Nên bật xác thực 2 lớp (2FA)
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Tài khoản Admin chỉ bảo vệ bằng mật khẩu. Bật TOTP (Google Authenticator / Authy) bên dưới để tăng bảo mật.
          </p>
        </div>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary shrink-0" aria-hidden="true" />
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

      {/* Admin 2FA card */}
      {isAdmin && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-primary shrink-0" aria-hidden="true" />
              Xác thực 2 lớp (TOTP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.is_2fa_enabled ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  2FA đang <span className="text-success font-medium">bật</span>. Đăng nhập admin sẽ yêu cầu mã 6 số.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="disable_password">Mật khẩu hiện tại</Label>
                  <Input
                    id="disable_password"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disable_code">Mã 2FA</Label>
                  <Input
                    id="disable_code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="font-mono tracking-widest"
                    autoComplete="one-time-code"
                  />
                </div>
                <Button
                  variant="destructive"
                  disabled={disableMutation.isPending || disableCode.length !== 6 || !disablePassword}
                  onClick={() => disableMutation.mutate()}
                >
                  {disableMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tắt 2FA
                </Button>
              </>
            ) : setupSecret ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Quét QR bằng Google Authenticator / Authy, hoặc nhập secret thủ công:
                </p>
                {qrUrl && (
                  <div className="inline-flex rounded-xl border border-border bg-card p-3">
                    <img
                      src={qrUrl}
                      alt="QR code thiết lập 2FA"
                      width={180}
                      height={180}
                      className="rounded-md bg-white"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md break-all font-mono">
                    {setupSecret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                    aria-label="Copy secret"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enable_code">Nhập mã 6 số để xác nhận</Label>
                  <Input
                    id="enable_code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="font-mono tracking-widest"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={enableMutation.isPending || enableCode.length !== 6}
                    onClick={() => enableMutation.mutate()}
                  >
                    {enableMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Xác nhận bật 2FA
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSetupSecret(null);
                      setSetupUri(null);
                      setEnableCode("");
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Bảo vệ tài khoản Admin bằng mã TOTP từ ứng dụng Authenticator.
                </p>
                <Button
                  disabled={setupMutation.isPending}
                  onClick={() => setupMutation.mutate()}
                >
                  {setupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Bắt đầu thiết lập 2FA
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
