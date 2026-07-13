import { useState } from "react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { SaleBadge } from "@/components/common/SaleBadge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, ZoomIn } from "lucide-react";

interface ImageGalleryProps {
  mainImage: string | null;
  extraImages?: string[] | null;
  productName: string;
  hasSale?: boolean;
  price?: number;
  salePrice?: number;
  /** Override displayed image (e.g. from color selection) */
  activeImage?: string | null;
}

/** Tối đa số thumbnail hiển thị; nhiều hơn sẽ scroll ngang. */
const THUMB_MAX = 5;

export default function ImageGallery({
  mainImage,
  extraImages,
  productName,
  hasSale,
  price,
  salePrice,
  activeImage,
}: ImageGalleryProps) {
  const allImages = [mainImage, ...(extraImages || [])].filter(Boolean) as string[];
  const [selectedIndex, setSelectedIndex] = useState(0);

  // activeImage (from color) overrides, otherwise use selectedIndex
  const displayImage = activeImage || allImages[selectedIndex] || mainImage;

  // Build thumbnails list — include activeImage if it's not already in the list
  const thumbnails = [...allImages];
  if (activeImage && !thumbnails.includes(activeImage)) {
    thumbnails.unshift(activeImage);
  }
  const uniqueThumbnails = [...new Set(thumbnails)];

  // Find the index of displayImage in thumbnails for highlighting
  const highlightIndex = uniqueThumbnails.indexOf(displayImage ?? "");

  const handleThumbnailClick = (idx: number) => {
    const clickedUrl = uniqueThumbnails[idx];
    const realIndex = allImages.indexOf(clickedUrl);
    setSelectedIndex(realIndex >= 0 ? realIndex : 0);
  };

  return (
    <div className="space-y-4">
      {/* Main image — click để phóng to (Dialog) */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label="Phóng to ảnh sản phẩm"
            className="relative block h-auto w-full aspect-[4/3] overflow-hidden rounded-xl border border-border/20 bg-muted p-0 shadow-sm group cursor-zoom-in hover:bg-muted"
          >
            {displayImage ? (
              <OptimizedImage
                /* key đổi theo ảnh → React remount → fade-in 150ms khi đổi ảnh */
                key={displayImage}
                src={displayImage}
                alt={productName}
                width={800}
                height={600}
                className="h-full w-full object-cover transition-transform group-hover:scale-105 animate-in fade-in-0 duration-150"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground/20" />
              </div>
            )}
            {hasSale && price != null && salePrice != null && (
              <div className="absolute top-4 left-4">
                <SaleBadge price={price} salePrice={salePrice} />
              </div>
            )}
            {displayImage && (
              <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-3.5 w-3.5" />
                Phóng to
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl p-2 bg-card">
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          {displayImage ? (
            <OptimizedImage
              src={displayImage}
              alt={productName}
              width={1200}
              height={900}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              priority
            />
          ) : (
            <div className="aspect-[4/3] flex items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Thumbnails — strip ngang, tối đa 5, scroll ngang nếu nhiều hơn */}
      {uniqueThumbnails.length > 1 && (
        <div className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1">
          {uniqueThumbnails.slice(0, THUMB_MAX).map((img, idx) => (
            <Button
              key={idx}
              type="button"
              variant="ghost"
              onClick={() => handleThumbnailClick(idx)}
              aria-label={`Xem ảnh ${idx + 1}`}
              aria-pressed={idx === highlightIndex}
              className={`h-auto w-20 shrink-0 snap-start overflow-hidden rounded-lg p-0 aspect-square ${
                idx === highlightIndex
                  ? "ring-2 ring-primary border-primary"
                  : "border border-border/30 hover:border-primary/50"
              }`}
            >
              <OptimizedImage
                src={img}
                alt={`${productName} - Ảnh ${idx + 1}`}
                width={150}
                height={150}
                className="h-full w-full object-cover"
              />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
