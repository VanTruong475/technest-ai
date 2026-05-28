import csv
import io
import math
from datetime import datetime, time, timezone
from typing import Optional

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.repositories.admin_repository import AdminRepository, VALID_ORDER_STATUSES
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

        reviews, total = review_repo.find_all(page=page, limit=limit)

        # Batch lookup users và products thay vì N+1
        user_ids = list({r.user_id for r in reviews})
        product_ids = list({r.product_id for r in reviews})

        from app.models.user import User
        from app.models.product import Product
        from sqlmodel import select

        user_map: dict[int, str] = {}
        if user_ids:
            users = list(self.repo.session.exec(select(User).where(User.id.in_(user_ids))).all())
            user_map = {u.id: u.full_name for u in users}

        product_map: dict[int, str] = {}
        if product_ids:
            products = list(self.repo.session.exec(select(Product).where(Product.id.in_(product_ids))).all())
            product_map = {p.id: p.name for p in products}

        items = []
        for r in reviews:
            items.append(
                AdminReviewItem(
                    id=r.id,
                    user_id=r.user_id,
                    user_name=user_map.get(r.user_id, "Unknown"),
                    product_id=r.product_id,
                    product_name=product_map.get(r.product_id, "Unknown"),
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

    def export_orders_csv(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        order_status: Optional[str] = None,
    ) -> StreamingResponse:
        if order_status and order_status not in VALID_ORDER_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_ORDER_STATUSES))}",
            )

        from_dt = None
        to_dt = None
        if from_date:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if to_date:
            to_dt = datetime.combine(
                datetime.strptime(to_date, "%Y-%m-%d").date(),
                time.max,
                tzinfo=timezone.utc,
            )

        rows = self.repo.export_orders(
            from_date=from_dt,
            to_date=to_dt,
            order_status=order_status,
        )

        headers = [
            "order_id", "order_date", "customer_name", "customer_email",
            "customer_phone", "shipping_address", "payment_method",
            "payment_status", "order_status", "product_name", "price",
            "sale_price", "quantity", "subtotal", "total_amount", "note",
        ]

        buffer = io.StringIO()
        buffer.write("﻿")  # UTF-8 BOM for Excel
        writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            row["order_date"] = row["order_date"].strftime("%Y-%m-%d %H:%M:%S") if row["order_date"] else ""
            writer.writerow(row)

        buffer.seek(0)
        filename = "orders_export.csv"
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
