/**
 * Status badge colors — khớp UI_PATTERNS.md "Status Badge màu sắc".
 * pending → yellow | processing → blue | completed → green | cancelled → red
 */
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: "Chờ xác nhận",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  SHIPPING: {
    label: "Đang giao",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export const ORDER_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"];

export const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: {
    label: "Chưa thanh toán",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  PENDING: {
    label: "Đang xử lý",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  PAID: {
    label: "Đã thanh toán",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  FAILED: {
    label: "Thất bại",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-muted-foreground bg-muted",
  },
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  VNPAY: "VNPay",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  INACTIVE: "Ngừng bán",
};

/** Fallback badge khi status lạ */
export const STATUS_BADGE_FALLBACK = "text-muted-foreground bg-muted";
