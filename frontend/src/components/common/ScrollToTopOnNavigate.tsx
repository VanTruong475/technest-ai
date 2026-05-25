import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset window scroll về top mỗi khi route đổi.
 *
 * React Router SPA mặc định KHÔNG reset scroll khi navigate — browser giữ
 * nguyên scrollY của trang trước. Hệ quả: scroll xuống cuối ProductList rồi
 * click vào 1 sản phẩm → ProductDetail mở ra đang ở giữa trang, phải lăn lên
 * mới thấy ảnh sản phẩm chính.
 *
 * Component render null, chỉ side-effect. Phải nằm trong Router subtree.
 * Dùng `behavior: "instant"` (mặc định) — animation smooth gây jarring khi
 * đổi page full.
 */
export default function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
}
