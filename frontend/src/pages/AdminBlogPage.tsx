import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/Skeleton";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { getErrorMessage } from "@/utils/api";
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

const CATEGORY_OPTIONS = ["review", "huong-dan", "tin-tuc"];

export default function AdminBlogPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);

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
        title, slug, excerpt: excerpt || undefined, content,
        image_url: imageUrl || undefined, category: category || undefined,
        tags: tags || undefined, published,
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
        title, slug, excerpt: excerpt || undefined, content,
        image_url: imageUrl || undefined, category: category || undefined,
        tags: tags || undefined, published,
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
    setTitle(""); setSlug(""); setExcerpt(""); setContent("");
    setImageUrl(""); setCategory(""); setTags(""); setPublished(false);
    setShowForm(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title); setSlug(post.slug); setExcerpt(post.excerpt || "");
    setContent(post.content); setImageUrl(post.image_url || "");
    setCategory(post.category || ""); setTags(post.tags || "");
    setPublished(post.published);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPost(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error("Vui lòng nhập tiêu đề, slug và nội dung");
      return;
    }
    if (editingPost) updateMutation.mutate();
    else createMutation.mutate();
  };

  const posts = data?.items || [];
  const totalPages = data?.total_pages || 1;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý Blog</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tạo bài viết
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editingPost ? "Sửa bài viết" : "Tạo bài viết mới"}</h2>
              <button onClick={closeForm} className="p-2 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Tiêu đề</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Tiêu đề bài viết" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Slug</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-mono" placeholder="tieu-de-bai-viet" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Tóm tắt</label>
                <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Mô tả ngắn..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Nội dung</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary resize-none" placeholder="Nội dung bài viết..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Ảnh URL</label>
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Danh mục</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                    <option value="">-- Chọn --</option>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Tags</label>
                  <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="tag1,tag2" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-primary" />
                Xuất bản ngay
              </label>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeForm}>Hủy</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPost ? "Cập nhật" : "Tạo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${post.published ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {post.published ? "Đã xuất bản" : "Nháp"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{post.view_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(post.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => togglePublishMutation.mutate(post)} className="p-1.5 rounded hover:bg-muted transition-colors" title={post.published ? "Ẩn bài" : "Xuất bản"}>
                          {post.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button onClick={() => openEdit(post)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </button>
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
      <button className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Xóa">
        <Trash2 className="h-4 w-4" />
      </button>
    </ConfirmDialog>
  );
}
