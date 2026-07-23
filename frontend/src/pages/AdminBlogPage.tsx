import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/common/Skeleton";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight,
} from "lucide-react";
import { getErrorMessage } from "@/utils/api";
import { formatDateShort } from "@/utils/format";
import type { PaginatedResponse } from "@/types";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  author_name: string | null;
  category: string | null;
  tags: string | null;
  published: boolean;
  published_at: string | null;
  view_count: number;
  created_at: string;
}

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  tags: string;
  published: boolean;
}

const EMPTY_BLOG_FORM: BlogFormData = {
  title: "", slug: "", excerpt: "", content: "",
  imageUrl: "", category: "", tags: "", published: false,
};

const CATEGORY_OPTIONS = ["review", "huong-dan", "tin-tuc"];

export default function AdminBlogPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BlogFormData>(EMPTY_BLOG_FORM);

  const { data, isLoading } = useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ["admin-blogs", page],
    queryFn: async () => {
      const res = await axiosClient.get("/api/blog", { params: { page, limit: 10 } });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.post("/api/blog", {
        title: form.title, slug: form.slug,
        excerpt: form.excerpt || undefined, content: form.content,
        image_url: form.imageUrl || undefined, category: form.category || undefined,
        tags: form.tags || undefined, published: form.published,
      });
    },
    onSuccess: () => {
      toast.success("Tạo bài viết thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-blogs"] });
      closeForm();
    },
    onError: (err) => toast.error(getErrorMessage(err, "Tạo bài viết thất bại")),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingPost) return;
      await axiosClient.put(`/api/blog/${editingPost.id}`, {
        title: form.title, slug: form.slug,
        excerpt: form.excerpt || undefined, content: form.content,
        image_url: form.imageUrl || undefined, category: form.category || undefined,
        tags: form.tags || undefined, published: form.published,
      });
    },
    onSuccess: () => {
      toast.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-blogs"] });
      closeForm();
    },
    onError: (err) => toast.error(getErrorMessage(err, "Cập nhật thất bại")),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (post: BlogPost) => {
      await axiosClient.put(`/api/blog/${post.id}`, { published: !post.published });
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-blogs"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Cập nhật thất bại")),
  });

  const openCreate = () => {
    setEditingPost(null);
    setForm(EMPTY_BLOG_FORM);
    setShowForm(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title, slug: post.slug, excerpt: post.excerpt || "",
      content: post.content, imageUrl: post.image_url || "",
      category: post.category || "", tags: post.tags || "",
      published: post.published,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPost(null);
    setForm(EMPTY_BLOG_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("Vui lòng nhập tiêu đề, slug và nội dung");
      return;
    }
    if (editingPost) updateMutation.mutate();
    else createMutation.mutate();
  };

  const posts = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý Blog</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tạo bài viết
        </Button>
      </div>

      {/* Sheet — Add / Edit Blog */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border mb-6">
            <SheetTitle className="text-lg font-semibold">
              {editingPost ? "Sửa bài viết" : "Tạo bài viết mới"}
            </SheetTitle>
            {editingPost && (
              <p className="text-sm text-muted-foreground">ID #{editingPost.id}</p>
            )}
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pb-10">

            {/* Nhóm 1: Thông tin cơ bản */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Thông tin cơ bản
              </h3>
              <div className="space-y-2">
                <Label htmlFor="blog-title" className="font-medium">Tiêu đề <span className="text-destructive">*</span></Label>
                <Input
                  id="blog-title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Tiêu đề bài viết"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-slug" className="font-medium">Slug <span className="text-destructive">*</span></Label>
                <Input
                  id="blog-slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="tieu-de-bai-viet"
                  className="h-10 font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="blog-category" className="font-medium">Danh mục</Label>
                  <select
                    id="blog-category"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Chọn --</option>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-tags" className="font-medium">Tags</Label>
                  <Input
                    id="blog-tags"
                    value={form.tags}
                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="tag1,tag2"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-excerpt" className="font-medium">Tóm tắt</Label>
                <Input
                  id="blog-excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Mô tả ngắn..."
                  className="h-10"
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Nhóm 2: Nội dung */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nội dung
              </h3>
              <div className="space-y-2">
                <Label htmlFor="blog-content" className="font-medium">Nội dung <span className="text-destructive">*</span></Label>
                <textarea
                  id="blog-content"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Nội dung bài viết..."
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Nhóm 3: Hình ảnh & Xuất bản */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Hình ảnh & Xuất bản
              </h3>
              <div className="space-y-2">
                <Label htmlFor="blog-image" className="font-medium">Ảnh URL</Label>
                <Input
                  id="blog-image"
                  value={form.imageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="h-10"
                />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                  className="accent-primary h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium">Xuất bản ngay</p>
                  <p className="text-xs text-muted-foreground">Bài viết sẽ hiển thị công khai</p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Đang lưu..." : editingPost ? "Cập nhật" : "Tạo bài viết"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Hủy</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold mb-2">Chưa có bài viết nào</p>
          <Button onClick={openCreate} size="sm">Tạo bài viết đầu tiên</Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Tiêu đề</th>
                  <th className="text-left px-4 py-3 font-semibold">Danh mục</th>
                  <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-semibold">Lượt xem</th>
                  <th className="text-left px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium line-clamp-1 max-w-xs">{post.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{post.category || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          post.published
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {post.published ? "Đã xuất bản" : "Nháp"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{post.view_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateShort(post.created_at) || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => togglePublishMutation.mutate(post)}
                          aria-label={post.published ? "Ẩn bài" : "Xuất bản"}
                          className="h-8 w-8"
                        >
                          {post.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => openEdit(post)}
                          aria-label={`Sửa ${post.title}`}
                          className="h-8 w-8 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete post={post} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Trang {page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ConfirmDelete({ post }: { post: BlogPost }) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async () => { await axiosClient.delete(`/api/blog/${post.id}`); },
    onSuccess: () => {
      toast.success("Đã xóa");
      queryClient.invalidateQueries({ queryKey: ["admin-blogs"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, "Xóa thất bại")),
  });

  return (
    <ConfirmDialog
      title="Xóa bài viết"
      description={`Bạn có chắc muốn xóa "${post.title}"?`}
      variant="destructive"
      onConfirm={() => deleteMutation.mutateAsync()}
    >
      <Button
        variant="ghost" size="icon"
        aria-label={`Xóa ${post.title}`}
        className="h-8 w-8 hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </ConfirmDialog>
  );
}
