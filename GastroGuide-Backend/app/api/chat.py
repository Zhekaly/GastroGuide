import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.ml.pipeline import get_pipeline
from app.models.ai_chat_message import AIChatMessage
from app.models.ai_chat_session import AIChatSession
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None   # UUID string of an existing session
    lat: Optional[float] = None
    lng: Optional[float] = None


class RestaurantCard(BaseModel):
    id: int
    name: str
    tag: Optional[str] = None
    rating: float
    category: Optional[str] = None
    distance: Optional[str] = None
    photo: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    price: Optional[str] = None
    is_open: bool = False


class ChatResponse(BaseModel):
    answer: str
    session_id: Optional[str]
    intent: str
    intent_confidence: float
    recommended_ids: list[int]
    recommended_restaurants: list[RestaurantCard] = []


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
) -> ChatResponse:
    """Process a chat message and return an AI-powered recommendation."""
    pipeline = get_pipeline()
    result = pipeline.process(
        db=db,
        message=body.message,
        user_id=user.id if user else None,
        lat=body.lat,
        lng=body.lng,
    )

    session_id = body.session_id

    if user:
        session: Optional[AIChatSession] = None

        # Try to resume an existing session
        if session_id:
            try:
                session = (
                    db.query(AIChatSession)
                    .filter(
                        AIChatSession.id == UUID(session_id),
                        AIChatSession.user_id == user.id,
                    )
                    .first()
                )
            except (ValueError, Exception) as exc:
                logger.warning("Invalid session_id %r: %s", session_id, exc)
                session = None

        # Create a new session when none found
        if not session:
            session = AIChatSession(
                user_id=user.id,
                title=body.message[:50],
            )
            db.add(session)
            db.flush()

        # Persist conversation turn
        db.add(AIChatMessage(session_id=session.id, role="user", text=body.message))
        db.add(AIChatMessage(session_id=session.id, role="assistant", text=result["answer"]))
        session.preview = result["answer"][:120]
        db.commit()
        session_id = str(session.id)

    return ChatResponse(
        answer=result["answer"],
        session_id=session_id,
        intent=result["intent"],
        intent_confidence=result["intent_confidence"],
        recommended_ids=result["recommended_ids"],
        recommended_restaurants=result.get("recommended_restaurants", []),
    )
