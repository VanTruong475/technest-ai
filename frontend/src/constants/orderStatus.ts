export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xác nhận", color: "text-yellow-600 bg-yellow-50" },
  CONFIRMED: { label: "Đã xác nhận", color: "text-blue-600 bg-blue-50" },
  SHIPPING: { label: "Đang giao", color: "text-purple-600 bg-purple-50" },
  COMPLETED: { label: "Hoàn thành", color: "text-green-600 bg-green-50" },
  CANCELLED: { label: "Đã hủy", color: "text-red-600 bg-red-50" },
};

export const ORDER_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"];

export const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "Chưa thanh toán", color: "text-yellow-600 bg-yellow-50" },
  PENDING: { label: "Đang xử lý", color: "text-blue-600 bg-blue-50" },
  PAID: { label: "Đã thanh toán", color: "text-green-600 bg-green-50" },
  FAILED: { label: "Thất bại", color: "text-red-600 bg-red-50" },
  CANCELLED: { label: "Đã hủy", color: "text-gray-600 bg-gray-50" },
};

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  VNPAY: "VNPay",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  INACTIVE: "Ngừng bán",
};
