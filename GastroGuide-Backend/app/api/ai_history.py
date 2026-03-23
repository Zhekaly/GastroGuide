# API endpoints для работы с историей AI-чата.
# Файл отвечает за создание сессий, получение списка сессий
# и получение сообщений конкретной AI-сессии пользователя.

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.ai_chat_message import AIChatMessage
from app.models.ai_chat_session import AIChatSession
from app.models.user import User
from app.schemas.ai_history import (
    AIChatMessageResponse,
    AIChatSessionCreateRequest,
    AIChatSessionResponse,
)

router = APIRouter(prefix="/api/v1/ai/sessions", tags=["AI History"])


@router.get("", response_model=list[AIChatSessionResponse])
def get_ai_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(AIChatSession)
        .filter(AIChatSession.user_id == current_user.id)
        .order_by(AIChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.post("", response_model=AIChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_ai_session(
    request: AIChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = AIChatSession(
        user_id=current_user.id,
        title=request.title,
        preview=None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}/messages", response_model=list[AIChatMessageResponse])
def get_ai_session_messages(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(AIChatSession)
        .filter(
            AIChatSession.id == session_id,
            AIChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    messages = (
        db.query(AIChatMessage)
        .filter(AIChatMessage.session_id == session_id)
        .order_by(AIChatMessage.created_at.asc())
        .all()
    )

    return messages

@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
def delete_ai_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(AIChatSession)
        .filter(
            AIChatSession.id == session_id,
            AIChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    db.delete(session)
    db.commit()

    return {"deleted": True}