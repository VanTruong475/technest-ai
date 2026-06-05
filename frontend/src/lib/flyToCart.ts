/**
 * Hiệu ứng "fly-to-cart": clone ảnh sản phẩm và cho bay tới icon giỏ hàng.
 * Thuần DOM + Web Animations API (không phụ thuộc React) để gọi được từ
 * bất kỳ event handler nào. Tự bỏ qua khi user bật prefers-reduced-motion.
 */

const CART_ICON_ID = "cart-icon";

export function flyToCart(sourceEl: HTMLElement | null, imageUrl?: string | null) {
  if (typeof window === "undefined" || !sourceEl) return;

  // Tôn trọng giảm chuyển động.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const target = document.getElementById(CART_ICON_ID);
  if (!target) return;

  const src = sourceEl.getBoundingClientRect();
  const dst = target.getBoundingClientRect();
  if (src.width === 0 || dst.width === 0) return;

  const flyer = document.createElement("div");
  flyer.style.cssText = [
    "position:fixed",
    `left:${src.left}px`,
    `top:${src.top}px`,
    `width:${Math.min(src.width, 120)}px`,
    `height:${Math.min(src.height, 120)}px`,
    "border-radius:12px",
    "overflow:hidden",
    "z-index:9999",
    "pointer-events:none",
    "box-shadow:0 8px 24px rgba(0,0,0,0.18)",
  ].join(";");

  if (imageUrl) {
    flyer.style.backgroundImage = `url(${imageUrl})`;
    flyer.style.backgroundSize = "cover";
    flyer.style.backgroundPosition = "center";
  } else {
    flyer.style.background = "var(--color-primary, #6366f1)";
  }

  document.body.appendChild(flyer);

  const dx = dst.left + dst.width / 2 - (src.left + Math.min(src.width, 120) / 2);
  const dy = dst.top + dst.height / 2 - (src.top + Math.min(src.height, 120) / 2);

  const anim = flyer.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 40}px) scale(0.6)`, opacity: 0.9, offset: 0.6 },
      { transform: `translate(${dx}px,${dy}px) scale(0.15)`, opacity: 0.2 },
    ],
    { duration: 700, easing: "cubic-bezier(0.55, 0, 0.45, 1)" }
  );

  anim.onfinish = () => {
    flyer.remove();
    // Nhịp "pop" nhỏ trên icon giỏ để báo đã nhận.
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
      { duration: 300, easing: "ease-out" }
    );
  };
  anim.oncancel = () => flyer.remove();
}
