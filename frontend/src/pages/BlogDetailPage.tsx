import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Skeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, ArrowLeft, BookOpen } from "lucide-react";
import { formatDateLong } from "@/utils/format";

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
  published_at: string | null;
  view_count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  "review": "Đánh giá",
  "huong-dan": "Hướng dẫn",
  "tin-tuc": "Tin tức",
};

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/blog/${slug}`);
      return res.data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6">
        <Skeleton className="h-6 w-32 mb-8" />
        <Skeleton className="aspect-[16/9] w-full rounded-2xl mb-8" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <BookOpen className="h-12 w-12" aria-hidden="true" />
        <p className="mt-4 text-lg font-medium text-foreground">Không tìm thấy bài viết</p>
        <p className="mt-1 text-sm">Bài viết có thể đã bị gỡ hoặc đường dẫn không đúng.</p>
        <Button asChild variant="outline" className="mt-6 rounded-xl">
          <Link to="/blog">Quay lại blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="mb-8 -ml-2 gap-2 text-muted-foreground">
        <Link to="/blog">
          <ArrowLeft className="h-4 w-4" />
          Quay lại blog
        </Link>
      </Button>

      {/* Cover image */}
      {post.image_url && (
        <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-muted">
          <OptimizedImage
            src={post.image_url}
            alt={post.title}
            width={900}
            height={506}
            className="w-full h-full object-cover"
            priority
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
        {post.category && (
          <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full uppercase">
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
        )}
        {post.published_at && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateLong(post.published_at)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {post.view_count} lượt xem
        </span>
        {post.author_name && (
          <span>bởi {post.author_name}</span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
        {post.title}
      </h1>

      {/* Excerpt */}
      {post.excerpt && (
        <p className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-4 border-primary/30 pl-4">
          {post.excerpt}
        </p>
      )}

      {/* Content — mobile-readable spacing */}
      <div className="max-w-none text-base md:text-lg">
        {post.content.split("\n").map((paragraph, i) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return <br key={i} />;

          // Bold headers (**text**)
          if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
            return (
              <h3 key={i} className="mt-6 mb-3 text-lg font-bold tracking-tight md:text-xl">
                {trimmed.replace(/\*\*/g, "")}
              </h3>
            );
          }

          // Numbered list items
          if (/^\d+\./.test(trimmed)) {
            return (
              <p key={i} className="mb-2 pl-4 leading-relaxed text-foreground">
                {trimmed}
              </p>
            );
          }

          // Regular paragraph
          return (
            <p key={i} className="mb-4 leading-relaxed text-foreground/90 text-pretty">
              {trimmed}
            </p>
          );
        })}
      </div>

      {/* Tags */}
      {post.tags && (
        <div className="mt-10 pt-6 border-t border-border/30">
          <div className="flex flex-wrap gap-2">
            {post.tags.split(",").map((tag) => (
              <span key={tag} className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                #{tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
