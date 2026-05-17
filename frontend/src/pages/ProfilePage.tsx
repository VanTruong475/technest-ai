import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Shield, Mail, Phone, CheckCircle, XCircle } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    updateMutation.mutate();
  };

  if (!user) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải thông tin...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Hồ sơ cá nhân</h1>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Vai trò:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.role === "ADMIN" ? "text-purple-600 bg-purple-50" : "text-blue-600 bg-blue-50"
            }`}>
              {user.role}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user.is_active ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm text-muted-foreground">Trạng thái:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.is_active ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
            }`}>
              {user.is_active ? "Hoạt động" : "Vô hiệu"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chỉnh sửa thông tin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
