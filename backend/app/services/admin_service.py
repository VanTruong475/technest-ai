import math

from fastapi import HTTPException, status
from sqlmodel import Session

from app.repositories.admin_repository import AdminRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_repository import UserRepository
from app.schemas.admin import (
    AdminDashboardResponse,
    AdminReviewItem,
    AdminReviewsResponse,
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

    def get_all_reviews(self, page: int = 1, limit: int = 10) -> AdminReviewsResponse:
        review_repo = ReviewRepository(self.repo.session)
        user_repo = UserRepository(self.repo.session)
        product_repo = ProductRepository(self.repo.session)

        reviews, total = review_repo.find_all(page=page, limit=limit)

        items = []
        for r in reviews:
            user = user_repo.find_by_id(r.user_id)
            product = product_repo.find_by_id(r.product_id)
            items.append(
                AdminReviewItem(
                    id=r.id,
                    user_id=r.user_id,
                    user_name=user.full_name if user else "Unknown",
                    product_id=r.product_id,
                    product_name=product.name if product else "Unknown",
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
            )

        return AdminReviewsResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=max(1, math.ceil(total / limit)),
        )

    def delete_review(self, review_id: int) -> None:
        review_repo = ReviewRepository(self.repo.session)
        review = review_repo.find_by_id(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found",
            )
        review_repo.delete(review)
