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
          <SheetHeader className="mb-6">
            <SheetTitle>{editingPost ? "Sửa bài viết" : "Tạo bài viết mới"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="blog-title">Tiêu đề *</Label>
                <Input
                  id="blog-title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Tiêu đề bài viết"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-slug">Slug *</Label>
                <Input
                  id="blog-slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="tieu-de-bai-viet"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blog-excerpt">Tóm tắt</Label>
              <Input
                id="blog-excerpt"
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Mô tả ngắn..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blog-content">Nội dung *</Label>
              <textarea
                id="blog-content"
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
                placeholder="Nội dung bài viết..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="blog-image">Ảnh URL</Label>
                <Input
                  id="blog-image"
                  value={form.imageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-category">Danh mục</Label>
                <select
                  id="blog-category"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">-- Chọn --</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blog-tags">Tags</Label>
                <Input
                  id="blog-tags"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1,tag2"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                className="accent-primary"
              />
              Xuất bản ngay
            </label>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : editingPost ? "Cập nhật" : "Tạo"}
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
