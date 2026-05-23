export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xác nhận", color: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/15" },
  CONFIRMED: { label: "Đã xác nhận", color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/15" },
  SHIPPING: { label: "Đang giao", color: "text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-500/15" },
  COMPLETED: { label: "Hoàn thành", color: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15" },
  CANCELLED: { label: "Đã hủy", color: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/15" },
};

export const ORDER_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"];

export const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "Chưa thanh toán", color: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/15" },
  PENDING: { label: "Đang xử lý", color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/15" },
  PAID: { label: "Đã thanh toán", color: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15" },
  FAILED: { label: "Thất bại", color: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/15" },
  CANCELLED: { label: "Đã hủy", color: "text-muted-foreground bg-muted" },
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  VNPAY: "VNPay",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  INACTIVE: "Ngừng bán",
};
