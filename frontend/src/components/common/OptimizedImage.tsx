import { useState } from "react";
import { getOptimizedImageUrl } from "@/utils/cloudinary";

const PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIgcng9IjgiLz48cGF0aCBkPSJNODAgNzBsMjAgMjBtLTItMmgyMHYyMEg3OHoiIHN0cm9rZT0iI2QxZDVkOCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMTMwIiBjeT0iODUiIHI9IjUiIHN0cm9rZT0iI2QxZDVkOCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  loading = "lazy",
  priority = false,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(() => getOptimizedImageUrl(src, width));

  return (
    <img
      src={imgSrc || PLACEHOLDER}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : loading}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
      onError={() => setImgSrc(PLACEHOLDER)}
    />
  );
}
