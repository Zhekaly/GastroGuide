# Admin CRUD для акций (offers).

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.admin.deps import (
    check_restaurant_access,
    get_current_admin_or_moderator,
    log_admin_action,
)
from app.core.database import get_db
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.admin.common import MessageResponse
from app.schemas.admin.offer import (
    AdminOfferCreate,
    AdminOfferResponse,
    AdminOfferUpdate,
)


router = APIRouter(prefix="/api/v1/admin/offers", tags=["Admin · Offers"])


def _to_response(offer: Offer, restaurant_name: str | None) -> AdminOfferResponse:
    return AdminOfferResponse(
        id=offer.id,
        restaurant_id=offer.restaurant_id,
        restaurant_name=restaurant_name,
        title=offer.title,
        description=offer.description,
        discount=offer.discount,
        expires=offer.expires,
        emoji=offer.emoji,
        color=offer.color,
        active=offer.active,
        created_at=offer.created_at,
    )


@router.get("", response_model=list[AdminOfferResponse])
def list_offers(
    active: bool | None = Query(default=None),
    restaurant_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    query = db.query(Offer, Restaurant.name).outerjoin(
        Restaurant, Restaurant.id == Offer.restaurant_id
    )

    if restaurant_id is not None:
        check_restaurant_access(actor, restaurant_id)
        query = query.filter(Offer.restaurant_id == restaurant_id)
    elif actor.is_moderator:
        moderated_ids = [r.id for r in actor.moderated_restaurants]
        if not moderated_ids:
            return []
        query = query.filter(Offer.restaurant_id.in_(moderated_ids))

    if active is not None:
        query = query.filter(Offer.active.is_(active))

    rows = query.order_by(Offer.created_at.desc()).all()
    return [_to_response(o, name) for o, name in rows]


@router.post("", response_model=AdminOfferResponse, status_code=status.HTTP_201_CREATED)
def create_offer(
    payload: AdminOfferCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    check_restaurant_access(actor, payload.restaurant_id)

    restaurant = db.query(Restaurant).filter(Restaurant.id == payload.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    offer = Offer(
        restaurant_id=payload.restaurant_id,
        title=payload.title,
        description=payload.description,
        discount=payload.discount,
        expires=payload.expires,
        emoji=payload.emoji,
        color=payload.color,
        active=payload.active,
    )
    db.add(offer)
    db.flush()
    log_admin_action(
        db, actor,
        action="offer.create",
        entity_type="offer",
        entity_id=offer.id,
        description=f"Создана акция '{offer.title}' для '{restaurant.name}'",
    )
    db.commit()
    db.refresh(offer)
    return _to_response(offer, restaurant.name)


@router.patch("/{offer_id}", response_model=AdminOfferResponse)
def update_offer(
    offer_id: int,
    payload: AdminOfferUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    check_restaurant_access(actor, offer.restaurant_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(offer, field, value)

    db.add(offer)
    db.flush()
    log_admin_action(
        db, actor,
        action="offer.update",
        entity_type="offer",
        entity_id=offer.id,
        description=f"Обновлена акция '{offer.title}'",
        payload={"changed": list(updates.keys())},
    )
    db.commit()
    db.refresh(offer)

    restaurant = db.query(Restaurant).filter(Restaurant.id == offer.restaurant_id).first()
    return _to_response(offer, restaurant.name if restaurant else None)


@router.delete("/{offer_id}", response_model=MessageResponse)
def delete_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    check_restaurant_access(actor, offer.restaurant_id)

    title = offer.title
    db.delete(offer)
    db.flush()
    log_admin_action(
        db, actor,
        action="offer.delete",
        entity_type="offer",
        entity_id=offer_id,
        description=f"Удалена акция '{title}'",
    )
    db.commit()
    return MessageResponse(message=f"Offer '{title}' deleted")
