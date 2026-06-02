import { useState } from "react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { SaleBadge } from "@/components/common/SaleBadge";
import { Package } from "lucide-react";

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
      {/* Main image */}
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border/20 shadow-sm relative group">
        {displayImage ? (
          <OptimizedImage
            key={displayImage}
            src={displayImage}
            alt={productName}
            width={800}
            height={600}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-24 w-24 text-muted-foreground/20" />
          </div>
        )}
        {hasSale && price != null && salePrice != null && (
          <div className="absolute top-4 left-4">
            <SaleBadge price={price} salePrice={salePrice} />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {uniqueThumbnails.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {uniqueThumbnails.slice(0, 4).map((img, idx) => (
            <button
              key={idx}
              onClick={() => handleThumbnailClick(idx)}
              className={`aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
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
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
