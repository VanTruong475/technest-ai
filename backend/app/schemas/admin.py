from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_users: int
    total_products: int
    total_orders: int
    total_revenue: float
    pending_orders: int
    low_stock_products: int
    out_of_stock_products: int
    total_reviews: int
    average_rating: float


class RevenueByDay(BaseModel):
    date: str
    revenue: float


class OrdersByStatus(BaseModel):
    status: str
    count: int


class TopProduct(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    total_revenue: float


class RecentOrder(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    created_at: str


class DashboardCharts(BaseModel):
    revenue_by_day: list[RevenueByDay]
    orders_by_status: list[OrdersByStatus]


class DashboardTrends(BaseModel):
    """% thay đổi tháng này so với tháng trước. None khi tháng trước = 0 (không có cơ sở so sánh)."""
    revenue: Optional[float] = None
    orders: Optional[float] = None
    users: Optional[float] = None
    products: Optional[float] = None


class AdminDashboardResponse(BaseModel):
    summary: DashboardSummary
    trends: DashboardTrends
    charts: DashboardCharts
    recent_orders: list[RecentOrder]
    top_products: list[TopProduct]


class AdminReviewItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    product_id: int
    product_name: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminReviewsResponse(BaseModel):
    items: list[AdminReviewItem]
    total: int
    page: int
    limit: int
    total_pages: int
