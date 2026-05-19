import hashlib
import hmac
import logging
from datetime import datetime, timezone
from urllib.parse import urlencode

from app.core.config import settings

logger = logging.getLogger("techsphere")


def build_payment_url(order_id: int, amount: float, ip_addr: str) -> str:
    """Build VNPay payment URL for an order."""
    vnp_params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.VNPAY_TMN_CODE,
        "vnp_Amount": str(int(amount) * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": f"order_{order_id}_{int(datetime.now(timezone.utc).timestamp())}",
        "vnp_OrderInfo": f"Thanh toan don hang #{order_id}",
        "vnp_OrderType": "other",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": settings.VNPAY_RETURN_URL,
        "vnp_IpAddr": ip_addr,
        "vnp_CreateDate": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
    }

    sorted_params = sorted(vnp_params.items())
    query_string = urlencode(sorted_params)

    hash_data = hmac.new(
        settings.VNPAY_HASH_SECRET.encode(),
        query_string.encode(),
        hashlib.sha512,
    ).hexdigest()

    payment_url = f"{settings.VNPAY_PAYMENT_URL}?{query_string}&vnp_SecureHash={hash_data}"
    return payment_url


def verify_return(params: dict[str, str]) -> tuple[bool, str | None]:
    """Verify VNPay return callback. Returns (is_valid, response_code)."""
    secure_hash = params.get("vnp_SecureHash", "")

    filtered = {
        k: v for k, v in params.items()
        if k.startswith("vnp_") and k != "vnp_SecureHash" and k != "vnp_SecureHashType"
    }

    sorted_params = sorted(filtered.items())
    query_string = urlencode(sorted_params)

    computed_hash = hmac.new(
        settings.VNPAY_HASH_SECRET.encode(),
        query_string.encode(),
        hashlib.sha512,
    ).hexdigest()

    if secure_hash != computed_hash:
        logger.warning("VNPay return: invalid secure hash")
        return False, None

    response_code = params.get("vnp_ResponseCode")
    return True, response_code


def extract_order_id(params: dict[str, str]) -> int | None:
    """Extract order_id from vnp_TxnRef (format: order_{id}_{timestamp})."""
    txn_ref = params.get("vnp_TxnRef", "")
    try:
        parts = txn_ref.split("_")
        if len(parts) >= 2 and parts[0] == "order":
            return int(parts[1])
    except (ValueError, IndexError):
        pass
    return None
