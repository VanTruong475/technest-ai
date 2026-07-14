import html as html_lib
import logging

import resend

from app.core.config import settings
from app.models.order import Order, OrderItem
from app.models.user import User

logger = logging.getLogger("techsphere")

STATUS_LABELS = {
    "PENDING": "Chờ xử lý",
    "CONFIRMED": "Đã xác nhận",
    "SHIPPING": "Đang giao hàng",
    "COMPLETED": "Hoàn thành",
    "CANCELLED": "Đã hủy",
}


def _is_configured() -> bool:
    return bool(settings.EMAIL_ENABLED and settings.RESEND_API_KEY)


def _mask_email(to: str) -> str:
    """Log-friendly recipient: keep domain, redact local part (a***@domain.com)."""
    if "@" not in to:
        return "***"
    local, _, domain = to.partition("@")
    if not local:
        return f"***@{domain}"
    return f"{local[0]}***@{domain}"


def _send(to: str, subject: str, html: str) -> bool:
    if not _is_configured():
        logger.warning(
            "Email not configured (EMAIL_ENABLED or RESEND_API_KEY missing), skipping"
        )
        return False

    masked = _mask_email(to)
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("Email sent to %s: %s", masked, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", masked, e)
        return False


def _format_price(price: float) -> str:
    return f"{price:,.0f}đ".replace(",", ".")


def _build_items_html(items: list[OrderItem]) -> str:
    rows = ""
    for item in items:
        price = item.sale_price if item.sale_price else item.price
        safe_name = html_lib.escape(item.product_name)
        rows += f"""
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">{safe_name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">{item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">{_format_price(price)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">{_format_price(item.subtotal)}</td>
        </tr>"""

    return f"""
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
            <tr style="background:#f8f9fa">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #dee2e6">Sản phẩm</th>
                <th style="padding:8px;text-align:center;border-bottom:2px solid #dee2e6">SL</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #dee2e6">Đơn giá</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #dee2e6">Thành tiền</th>
            </tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""


def send_order_confirmation(user: User, order: Order, items: list[OrderItem]) -> bool:
    items_html = _build_items_html(items)
    safe_name = html_lib.escape(user.full_name)
    safe_address = html_lib.escape(order.shipping_address)
    safe_phone = html_lib.escape(order.phone)
    safe_note = html_lib.escape(order.note) if order.note else ""

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Xác nhận đơn hàng #{order.id}</h2>
        <p>Xin chào <strong>{safe_name}</strong>,</p>
        <p>Cảm ơn bạn đã đặt hàng tại <strong>TechSphere AI</strong>!</p>

        {items_html}

        <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:4px 0"><strong>Tổng cộng:</strong> {_format_price(order.total_amount)}</p>
            <p style="margin:4px 0"><strong>Địa chỉ:</strong> {safe_address}</p>
            <p style="margin:4px 0"><strong>Điện thoại:</strong> {safe_phone}</p>
            {"<p style='margin:4px 0'><strong>Ghi chú:</strong> " + safe_note + "</p>" if safe_note else ""}
        </div>

        <p style="color:#6b7280;font-size:14px">
            Chúng tôi sẽ thông báo khi đơn hàng được xử lý.
        </p>
    </div>"""

    return _send(
        to=user.email,
        subject=f"TechSphere AI - Xác nhận đơn hàng #{order.id}",
        html=html,
    )


def send_password_reset_email(user: User, token: str) -> bool:
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    safe_name = html_lib.escape(user.full_name)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Đặt lại mật khẩu</h2>
        <p>Xin chào <strong>{safe_name}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
        <div style="text-align:center;margin:24px 0">
            <a href="{reset_link}"
               style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">
                Đặt lại mật khẩu
            </a>
        </div>
        <p style="color:#6b7280;font-size:14px">
            Link này sẽ hết hạn sau <strong>15 phút</strong>.
        </p>
        <p style="color:#6b7280;font-size:14px">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
    </div>"""

    return _send(
        to=user.email,
        subject="TechSphere AI - Đặt lại mật khẩu",
        html=html,
    )


def send_status_update(user: User, order: Order, old_status: str, new_status: str) -> bool:
    old_label = STATUS_LABELS.get(old_status, old_status)
    new_label = STATUS_LABELS.get(new_status, new_status)
    safe_name = html_lib.escape(user.full_name)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Cập nhật đơn hàng #{order.id}</h2>
        <p>Xin chào <strong>{safe_name}</strong>,</p>
        <p>Đơn hàng <strong>#{order.id}</strong> của bạn đã được cập nhật:</p>

        <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:4px 0">
                <strong>Trạng thái:</strong>
                <span style="color:#6b7280">{old_label}</span>
                → <span style="color:#2563eb;font-weight:bold">{new_label}</span>
            </p>
            <p style="margin:4px 0"><strong>Tổng cộng:</strong> {_format_price(order.total_amount)}</p>
        </div>

        {"<p style='color:#16a34a;font-weight:bold'>Đơn hàng đã hoàn thành! Cảm ơn bạn đã mua sắm.</p>" if new_status == "COMPLETED" else ""}
        {"<p style='color:#dc2626'>Đơn hàng đã bị hủy.</p>" if new_status == "CANCELLED" else ""}
    </div>"""

    return _send(
        to=user.email,
        subject=f"TechSphere AI - Đơn hàng #{order.id} - {new_label}",
        html=html,
    )
