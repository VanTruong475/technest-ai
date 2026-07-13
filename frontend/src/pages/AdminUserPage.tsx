import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pencil, X } from "lucide-react";
import Pagination from "@/components/common/Pagination";

import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";
import { TableSkeleton } from "@/components/common/Skeleton";
import { getErrorMessage } from "@/utils/api";
import { formatDateShort } from "@/utils/format";
import type { User, UsersResponse } from "@/types";

interface UserFormData {
  full_name: string;
  phone: string;
  role: string;
  is_active: boolean;
}

export default function AdminUserPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  useScrollToTopOnChange(page);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>({ full_name: "", phone: "", role: "USER", is_active: true });

  // Fetch users
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["admin-users", page],
    queryFn: async () => {
      const res = await axiosClient.get("/api/users", { params: { page, limit: 10 } });
      return res.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserFormData }) => {
      await axiosClient.put(`/api/users/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Cập nhật user thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      closeForm();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Cập nhật thất bại"));
    },
  });

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.role,
      is_active: user.is_active,
    });
  };

  const closeForm = () => {
    setEditingUser(null);
    setForm({ full_name: "", phone: "", role: "USER", is_active: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: form });
    }
  };

  const users = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground">{data?.total || 0} người dùng</p>
      </div>

      {/* Edit Form */}
      {editingUser && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sửa người dùng #{editingUser.id}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm} aria-label="Đóng form">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ tên *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <select
                  id="role"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Trạng thái</Label>
                <select
                  id="is_active"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "true" }))}
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Vô hiệu</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Đang lưu..." : "Cập nhật"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={5} />
      ) : error ? (
        <div className="text-center py-12 text-destructive">Không thể tải danh sách người dùng.</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Không có người dùng nào.</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Họ tên</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Điện thoại</th>
                    <th className="text-center p-3 font-medium">Vai trò</th>
                    <th className="text-center p-3 font-medium">Trạng thái</th>
                    <th className="text-left p-3 font-medium">Ngày tạo</th>
                    <th className="text-center p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{user.id}</td>
                      <td className="p-3 font-medium">{user.full_name}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3 text-muted-foreground">{user.phone || "—"}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.role === "ADMIN"
                            ? "bg-muted text-foreground"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {user.is_active ? "Hoạt động" : "Vô hiệu"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDateShort(user.created_at)}</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(user)} aria-label={`Chỉnh sửa ${user.full_name}`} className="h-8 w-8 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
