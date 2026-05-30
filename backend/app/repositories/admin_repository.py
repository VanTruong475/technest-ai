from datetime import datetime, time, timedelta, timezone
from typing import Optional

from sqlmodel import Session, select, func, col

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.review import Review
from app.models.user import User

VALID_ORDER_STATUSES = {"PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"}


LOW_STOCK_THRESHOLD = 10


class AdminRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def count_users(self) -> int:
        statement = select(func.count()).select_from(User)
        return self.session.exec(statement).one()

    def count_products(self) -> int:
        statement = select(func.count()).select_from(Product)
        return self.session.exec(statement).one()

    def count_orders(self) -> int:
        statement = select(func.count()).select_from(Order)
        return self.session.exec(statement).one()

    def sum_revenue(self) -> float:
        statement = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.status != "CANCELLED",
            Order.payment_status == "PAID",
        )
        return float(self.session.exec(statement).one())

    def count_pending_orders(self) -> int:
        statement = select(func.count()).select_from(Order).where(Order.status == "PENDING")
        return self.session.exec(statement).one()

    def count_low_stock_products(self) -> int:
        statement = (
            select(func.count())
            .select_from(Product)
            .where(col(Product.stock) > 0, col(Product.stock) <= LOW_STOCK_THRESHOLD)
        )
        return self.session.exec(statement).one()

    def count_out_of_stock_products(self) -> int:
        statement = select(func.count()).select_from(Product).where(Product.stock == 0)
        return self.session.exec(statement).one()

    def count_reviews(self) -> int:
        statement = select(func.count()).select_from(Review)
        return self.session.exec(statement).one()

    def average_rating(self) -> float:
        statement = select(func.coalesce(func.avg(Review.rating), 0))
        return round(float(self.session.exec(statement).one()), 2)

    def revenue_by_day(self, days: int = 7) -> list[dict]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        statement = (
            select(
                func.date(Order.created_at).label("date"),
                func.sum(Order.total_amount).label("revenue"),
            )
            .where(Order.status != "CANCELLED", Order.created_at >= cutoff)
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        )
        results = self.session.exec(statement).all()
        return [{"date": str(row.date), "revenue": float(row.revenue)} for row in results]

    def orders_by_status(self) -> list[dict]:
        statement = (
            select(Order.status, func.count().label("count"))
            .group_by(Order.status)
        )
        results = self.session.exec(statement).all()
        return [{"status": row.status, "count": row.count} for row in results]

    def recent_orders(self, limit: int = 5) -> list[Order]:
        statement = select(Order).order_by(col(Order.created_at).desc()).limit(limit)
        return list(self.session.exec(statement).all())

    def top_selling_products(self, limit: int = 5) -> list[dict]:
        statement = (
            select(
                OrderItem.product_id,
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("total_quantity"),
                func.sum(OrderItem.subtotal).label("total_revenue"),
            )
            .group_by(OrderItem.product_id, OrderItem.product_name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(limit)
        )
        results = self.session.exec(statement).all()
        return [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "total_quantity": int(row.total_quantity),
                "total_revenue": float(row.total_revenue),
            }
            for row in results
        ]

    def export_orders(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        order_status: Optional[str] = None,
    ) -> list[dict]:
        statement = (
            select(
                Order.id.label("order_id"),
                Order.created_at.label("order_date"),
                User.full_name.label("customer_name"),
                User.email.label("customer_email"),
                Order.phone.label("customer_phone"),
                Order.shipping_address,
                Order.payment_method,
                Order.payment_status,
                Order.status.label("order_status"),
                OrderItem.product_name,
                OrderItem.price,
                OrderItem.sale_price,
                OrderItem.quantity,
                OrderItem.subtotal,
                Order.total_amount,
                Order.note,
            )
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(User, Order.user_id == User.id)
            .order_by(col(Order.created_at).desc(), Order.id, OrderItem.id)
        )

        if from_date is not None:
            statement = statement.where(Order.created_at >= from_date)
        if to_date is not None:
            statement = statement.where(Order.created_at <= to_date)
        if order_status is not None:
            statement = statement.where(Order.status == order_status)

        results = self.session.exec(statement).all()
        return [dict(row._mapping) for row in results]
