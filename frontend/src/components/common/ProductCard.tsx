import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/common/StarRating";
import HeartButton from "@/components/common/HeartButton";
import { formatPrice } from "@/utils/format";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  /** Show brand/category labels (used in ProductListPage) */
  showBrandCategory?: boolean;
  /** Show wishlist heart button on hover */
  showWishlist?: boolean;
  /** Show star rating if available */
  showRating?: boolean;
  /** Brand/category name lookup functions */
  brandName?: string;
  categoryName?: string;
  /** Từ khoá tìm kiếm — highlight phần khớp trong tên sản phẩm */
  highlight?: string;
}

/** Coi là "Mới" nếu được tạo trong vòng 14 ngày gần đây. */
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
function isNewProduct(createdAt?: string): boolean {
  if (!createdAt) return false;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < NEW_WINDOW_MS;
}

/** Escape ký tự đặc biệt regex trong từ khoá người dùng nhập. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bọc phần khớp từ khoá bằng <mark> màu primary. */
function highlightMatch(text: string, query?: string) {
  const q = query?.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-primary/15 text-primary font-semibold rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function ProductCard({
  product,
  showBrandCategory = false,
  showWishlist = false,
  showRating = false,
  brandName,
  categoryName,
  highlight,
}: ProductCardProps) {
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const hasRating = showRating && product.average_rating != null && product.average_rating > 0;
  const outOfStock = product.stock <= 0;
  const isNew = isNewProduct(product.created_at);
  const salePercent = hasSale
    ? Math.round((1 - product.sale_price! / product.price) * 100)
    : 0;

  return (
    <Link to={`/products/${product.id}`} className="group block h-full">
      {/* Hover theo UI_PATTERNS.md: shadow-md + scale-[1.02] transition-all duration-200
          (motion-reduce: bỏ scale để tôn trọng prefers-reduced-motion) */}
      <Card className="h-full cursor-pointer relative overflow-hidden border-border/60 rounded-2xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] motion-reduce:hover:scale-100">
        {/* Badge New/Sale — absolute top-2 left-2 (stack dọc) */}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1.5">
          {hasSale && (
            <span className="bg-sale text-sale-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              -{salePercent}%
            </span>
          )}
          {isNew && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              Mới
            </span>
          )}
        </div>

        {/* Badge tồn kho — absolute top-2 right-2 (màu theo UI_PATTERNS.md) */}
        {outOfStock && (
          <span className="absolute top-2 right-2 z-10 text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Hết hàng
          </span>
        )}

        {/* Wishlist button — bottom-2 right-2 để không đè badge tồn kho */}
        {showWishlist && (
          <div className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <HeartButton productId={product.id} />
          </div>
        )}

        {/* Image */}
        <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center rounded-t-2xl overflow-hidden">
          {product.image_url ? (
            <OptimizedImage
              src={product.image_url}
              alt={product.name}
              width={400}
              height={300}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="text-4xl" aria-hidden="true">📦</span>
          )}
        </div>

        <CardContent className="space-y-2 p-4">
          {/* Brand / Category */}
          {showBrandCategory && (brandName || categoryName) && (
            <div className="flex items-center gap-2">
              {brandName && (
                <span className="text-xs font-semibold text-primary">{brandName}</span>
              )}
              {categoryName && (
                <span className="text-xs text-muted-foreground">· {categoryName}</span>
              )}
            </div>
          )}

          {/* Name */}
          <h3 className="font-medium line-clamp-2 text-sm leading-snug min-h-[2.5rem]">
            {highlightMatch(product.name, highlight)}
          </h3>

          {/* Rating */}
          {hasRating && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={Math.round(product.average_rating!)} size="sm" />
              <span className="text-xs text-muted-foreground">
                {product.average_rating!.toFixed(1)}
                {product.review_count != null && product.review_count > 0 && (
                  <span> ({product.review_count})</span>
                )}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 flex-wrap">
            {hasSale ? (
              <>
                <span className="text-base font-bold text-primary">
                  {formatPrice(product.sale_price!)}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* Stock status */}
          <p
            className={`text-xs font-medium ${
              product.stock > 0 ? "text-success" : "text-destructive"
            }`}
          >
            {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
