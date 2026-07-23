import { useEffect, useMemo, useState } from "react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { SaleBadge } from "@/components/common/SaleBadge";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Package, ZoomIn } from "lucide-react";

interface ImageGalleryProps {
  mainImage: string | null;
  extraImages?: string[] | null;
  productName: string;
  hasSale?: boolean;
  price?: number;
  salePrice?: number;
  /**
   * When parent selects a color, jump gallery to this URL (if present).
   * Does NOT lock the gallery — user can still browse other thumbs/arrows.
   */
  activeImage?: string | null;
}

export default function ImageGallery({
  mainImage,
  extraImages,
  productName,
  hasSale,
  price,
  salePrice,
  activeImage,
}: ImageGalleryProps) {
  // Stable ordered list: main → extras → any color image not already included
  const images = useMemo(() => {
    const base = [mainImage, ...(extraImages || [])].filter(Boolean) as string[];
    const list = [...new Set(base)];
    if (activeImage && !list.includes(activeImage)) {
      list.push(activeImage);
    }
    return list;
  }, [mainImage, extraImages, activeImage]);

  const [index, setIndex] = useState(0);

  // Color change → jump to that image (once per activeImage change)
  useEffect(() => {
    if (!activeImage || images.length === 0) return;
    const i = images.indexOf(activeImage);
    if (i >= 0) setIndex(i);
  }, [activeImage]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to color URL change

  // Clamp if list shrinks
  useEffect(() => {
    if (images.length === 0) {
      setIndex(0);
      return;
    }
    if (index > images.length - 1) setIndex(0);
  }, [images.length, index]);

  const displayImage = images[index] ?? mainImage;
  const canNavigate = images.length > 1;

  const go = (next: number) => {
    if (!canNavigate) return;
    const len = images.length;
    setIndex(((next % len) + len) % len);
  };

  const goPrev = () => go(index - 1);
  const goNext = () => go(index + 1);

  return (
    <div className="space-y-3">
      {/* Main stage */}
      <div className="relative group/stage">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Phóng to ảnh sản phẩm"
              className="relative block h-auto w-full aspect-[4/3] overflow-hidden rounded-2xl border border-border/30 bg-muted p-0 shadow-sm cursor-zoom-in hover:bg-muted"
            >
              {displayImage ? (
                <OptimizedImage
                  key={displayImage}
                  src={displayImage}
                  alt={`${productName} - ảnh ${index + 1}`}
                  width={800}
                  height={600}
                  className="h-full w-full object-contain bg-muted animate-in fade-in-0 duration-200"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground/20" />
                </div>
              )}
              {hasSale && price != null && salePrice != null && (
                <div className="absolute top-4 left-4 z-10">
                  <SaleBadge price={price} salePrice={salePrice} />
                </div>
              )}
              {displayImage && (
                <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover/stage:opacity-100">
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

        {/* Prev / next — Apple-style soft controls on the photo */}
        {canNavigate && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Ảnh trước"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full bg-background/90 shadow-sm border border-border/40 opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Ảnh sau"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full bg-background/90 shadow-sm border border-border/40 opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground backdrop-blur-sm">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {canNavigate && (
        <div
          className="flex gap-2.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5"
          role="listbox"
          aria-label="Ảnh sản phẩm"
        >
          {images.map((img, i) => {
            const active = i === index;
            return (
              <button
                key={`${img}-${i}`}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={`Xem ảnh ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`relative h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  active
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <OptimizedImage
                  src={img}
                  alt=""
                  width={120}
                  height={120}
                  className="h-full w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
