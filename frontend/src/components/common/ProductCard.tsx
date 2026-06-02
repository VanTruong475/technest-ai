import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Card, CardContent } from "@/components/ui/card";
import { SaleBadge } from "@/components/common/SaleBadge";
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
}

export default function ProductCard({
  product,
  showBrandCategory = false,
  showWishlist = false,
  showRating = false,
  brandName,
  categoryName,
}: ProductCardProps) {
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const hasRating = showRating && product.average_rating != null && product.average_rating > 0;

  return (
    <Link to={`/products/${product.id}`} className="group block h-full">
      <Card className="h-full transition-all duration-300 cursor-pointer relative overflow-hidden border-border/60 hover:border-border hover:shadow-xl hover:-translate-y-1 rounded-2xl">
        {/* Sale badge */}
        {hasSale && (
          <SaleBadge price={product.price} salePrice={product.sale_price!} />
        )}

        {/* Wishlist button */}
        {showWishlist && (
          <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
            {product.name}
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
                <span className="text-base font-bold text-destructive">
                  {formatPrice(product.sale_price!)}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* Stock status */}
          <p
            className={`text-xs font-medium ${
              product.stock > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
