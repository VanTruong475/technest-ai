import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Calendar, Eye, ArrowRight, BookOpen } from "lucide-react";
import type { PaginatedResponse } from "@/types";

interface BlogPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  author_name: string | null;
  category: string | null;
  published_at: string | null;
  view_count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  "review": "Đánh giá",
  "huong-dan": "Hướng dẫn",
  "tin-tuc": "Tin tức",
};

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const { data, isLoading } = useQuery<PaginatedResponse<BlogPostSummary>>({
    queryKey: ["blog", page, category],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 9 };
      if (category) params.category = category;
      const res = await axiosClient.get("/api/blog", { params });
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/blog/categories");
      return res.data;
    },
  });

  const posts = data?.items || [];
  const totalPages = data?.total_pages || 1;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted-foreground text-sm mt-1">Tin tức, đánh giá và hướng dẫn công nghệ</p>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !category ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSearchParams({ category: cat })}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/60 overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-5 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && posts.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold mb-2">Chưa có bài viết nào</p>
          <p className="text-muted-foreground text-sm">Quay lại sau nhé!</p>
        </div>
      )}

      {/* Posts grid */}
      {!isLoading && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group">
              <article className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                {/* Image */}
                <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                  {post.image_url ? (
                    <OptimizedImage
                      src={post.image_url}
                      alt={post.title}
                      width={600}
                      height={375}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {post.category && (
                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {CATEGORY_LABELS[post.category] || post.category}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{post.excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {post.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.published_at)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.view_count}
                      </span>
                    </div>
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Đọc <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("page", String(p));
                setSearchParams(params);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
