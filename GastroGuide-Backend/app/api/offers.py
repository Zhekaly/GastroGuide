# API endpoints для работы с акциями заведений.
# Файл отвечает за:
# - получение всех акций
# - получение одной акции по id

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.schemas.offer import OfferResponse

router = APIRouter(prefix="/api/v1/offers", tags=["Offers"])


@router.get("", response_model=list[OfferResponse])
def get_offers(db: Session = Depends(get_db)):
    return (
        db.query(Offer)
        .join(Restaurant, Restaurant.id == Offer.restaurant_id)
        .filter(
            Offer.active.is_(True),
            Restaurant.is_hidden.is_(False),
        )
        .all()
    )

@router.get("/{offer_id}", response_model=OfferResponse)
def get_offer_by_id(offer_id: int, db: Session = Depends(get_db)):
    offer = (
        db.query(Offer)
        .join(Restaurant, Restaurant.id == Offer.restaurant_id)
        .filter(
            Offer.id == offer_id,
            Offer.active.is_(True),
            Restaurant.is_hidden.is_(False),
        )
        .first()
    )

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    return offer
