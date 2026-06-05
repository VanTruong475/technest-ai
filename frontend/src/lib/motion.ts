import { useReducedMotion, type Variants, type Transition } from "framer-motion";

/**
 * Motion layer dùng chung cho toàn app.
 * Mọi variants đều tôn trọng `prefers-reduced-motion`: khi user bật giảm
 * chuyển động, dùng `useReducedMotionSafe()` để trả về variants "tĩnh".
 */

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

/** Fade + trượt lên nhẹ — dùng cho section / item reveal. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/** Container stagger — cho grid sản phẩm reveal lần lượt. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Page transition fade nhẹ giữa các route. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE } },
};

/** Variants "tĩnh" khi reduced-motion: chỉ fade, không dịch chuyển. */
const STATIC: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
  },
  pageTransition: {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 0.01 } },
    exit: { opacity: 0, transition: { duration: 0.01 } },
  },
};

/**
 * Trả về variants an toàn theo preference của user.
 * Khi reduced-motion: bỏ mọi dịch chuyển, giữ fade tối thiểu.
 */
export function useReducedMotionSafe() {
  const reduce = useReducedMotion();
  return {
    reduce: !!reduce,
    fadeUp: reduce ? STATIC.fadeUp : fadeUp,
    staggerContainer: reduce ? STATIC.fadeUp : staggerContainer,
    pageTransition: reduce ? STATIC.pageTransition : pageTransition,
    /** y offset cho hover lift — 0 khi reduced. */
    hoverLift: reduce ? 0 : -4,
  };
}
