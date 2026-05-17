from datetime import datetime

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.cart import Cart, CartItem
from app.models.user import User
from app.repositories.cart_repository import CartItemRepository, CartRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse, CartResponse


def _build_cart_response(cart: Cart, session: Session) -> CartResponse:
    item_repo = CartItemRepository(session)
    product_repo = ProductRepository(session)

    items = item_repo.find_by_cart_id(cart.id)
    cart_items = []
    total_items = 0
    total_amount = 0.0

    for item in items:
        product = product_repo.find_by_id(item.product_id)
        if product:
            price = product.sale_price if product.sale_price else product.price
            subtotal = price * item.quantity
            cart_items.append(CartItemResponse(
                id=item.id,
                product_id=product.id,
                product_name=product.name,
                image_url=product.image_url,
                price=product.price,
                sale_price=product.sale_price,
                quantity=item.quantity,
                subtotal=subtotal,
            ))
            total_items += item.quantity
            total_amount += subtotal

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        items=cart_items,
        total_items=total_items,
        total_amount=total_amount,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


def get_cart(current_user: User, session: Session) -> CartResponse:
    cart_repo = CartRepository(session)
    cart = cart_repo.find_by_user_id(current_user.id)

    if not cart:
        cart = Cart(user_id=current_user.id)
        cart = cart_repo.create(cart)

    return _build_cart_response(cart, session)


def add_item(
    current_user: User,
    data: CartItemCreate,
    session: Session,
) -> CartResponse:
    cart_repo = CartRepository(session)
    item_repo = CartItemRepository(session)
    product_repo = ProductRepository(session)

    cart = cart_repo.find_by_user_id(current_user.id)
    if not cart:
        cart = Cart(user_id=current_user.id)
        cart = cart_repo.create(cart)

    product = product_repo.find_by_id(data.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if product.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is not available"
        )

    existing_item = item_repo.find_by_cart_and_product(cart.id, data.product_id)

    if existing_item:
        new_quantity = existing_item.quantity + data.quantity
        if new_quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock. Available: {product.stock}"
            )
        existing_item.quantity = new_quantity
        existing_item.updated_at = datetime.utcnow()
        item_repo.update(existing_item)
    else:
        if data.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock. Available: {product.stock}"
            )
        new_item = CartItem(
            cart_id=cart.id,
            product_id=data.product_id,
            quantity=data.quantity,
        )
        item_repo.create(new_item)

    cart.updated_at = datetime.utcnow()
    cart_repo.update(cart)

    return _build_cart_response(cart, session)


def update_item(
    current_user: User,
    item_id: int,
    data: CartItemUpdate,
    session: Session,
) -> CartResponse:
    cart_repo = CartRepository(session)
    item_repo = CartItemRepository(session)
    product_repo = ProductRepository(session)

    cart = cart_repo.find_by_user_id(current_user.id)
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )

    item = item_repo.find_by_id(item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )

    product = product_repo.find_by_id(item.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if data.quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough stock. Available: {product.stock}"
        )

    item.quantity = data.quantity
    item.updated_at = datetime.utcnow()
    item_repo.update(item)

    cart.updated_at = datetime.utcnow()
    cart_repo.update(cart)

    return _build_cart_response(cart, session)


def delete_item(
    current_user: User,
    item_id: int,
    session: Session,
) -> CartResponse:
    cart_repo = CartRepository(session)
    item_repo = CartItemRepository(session)

    cart = cart_repo.find_by_user_id(current_user.id)
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )

    item = item_repo.find_by_id(item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )

    item_repo.delete(item)

    cart.updated_at = datetime.utcnow()
    cart_repo.update(cart)

    return _build_cart_response(cart, session)
