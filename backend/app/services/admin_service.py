from sqlmodel import Session

from app.repositories.admin_repository import AdminRepository
from app.schemas.admin import (
    AdminDashboardResponse,
    DashboardCharts,
    DashboardSummary,
    RecentOrder,
    RevenueByDay,
    OrdersByStatus,
    TopProduct,
)


class AdminService:
    def __init__(self, session: Session) -> None:
        self.repo = AdminRepository(session)

    def get_dashboard_stats(self) -> AdminDashboardResponse:
        summary = DashboardSummary(
            total_users=self.repo.count_users(),
            total_products=self.repo.count_products(),
            total_orders=self.repo.count_orders(),
            total_revenue=self.repo.sum_revenue(),
            pending_orders=self.repo.count_pending_orders(),
            low_stock_products=self.repo.count_low_stock_products(),
            out_of_stock_products=self.repo.count_out_of_stock_products(),
            total_reviews=self.repo.count_reviews(),
            average_rating=self.repo.average_rating(),
        )

        charts = DashboardCharts(
            revenue_by_day=[RevenueByDay(**r) for r in self.repo.revenue_by_day(days=7)],
            orders_by_status=[OrdersByStatus(**r) for r in self.repo.orders_by_status()],
        )

        recent_orders = [
            RecentOrder(
                id=o.id,
                user_id=o.user_id,
                total_amount=o.total_amount,
                status=o.status,
                created_at=o.created_at.isoformat(),
            )
            for o in self.repo.recent_orders(limit=5)
        ]

        top_products = [TopProduct(**p) for p in self.repo.top_selling_products(limit=5)]

        return AdminDashboardResponse(
            summary=summary,
            charts=charts,
            recent_orders=recent_orders,
            top_products=top_products,
        )
