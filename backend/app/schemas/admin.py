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


class AdminDashboardResponse(BaseModel):
    summary: DashboardSummary
    charts: DashboardCharts
    recent_orders: list[RecentOrder]
    top_products: list[TopProduct]
