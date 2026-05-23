import { useEffect } from "react";

/**
 * Cuộn lên đầu trang khi giá trị `value` thay đổi (pagination, filter...).
 */
export function useScrollToTopOnChange(value: unknown) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [value]);
}
