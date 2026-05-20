/**
 * Chèn Cloudinary transformation params vào URL.
 * f_auto: tự serve WebP/AVIF theo browser support
 * q_auto: nén thông minh
 * w_{width}: resize theo width yêu cầu
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number
): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com")) return url;

  return url.replace(
    /\/upload\/(v\d+\/)?/,
    `/upload/f_auto,q_auto,w_${width}/$1`
  );
}
