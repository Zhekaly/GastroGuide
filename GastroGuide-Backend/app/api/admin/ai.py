# Admin аналитика и управление AI-сессиями.

from collections import Counter
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin, log_admin_action
from app.core.database import get_db
from app.models.ai_chat_message import AIChatMessage
from app.models.ai_chat_session import AIChatSession
from app.models.user import User
from app.schemas.admin.ai import (
    AdminAIAnalyticsResponse,
    AdminAIMessageItem,
    AdminAISessionItem,
    AdminAITopPrompt,
)
from app.schemas.admin.common import MessageResponse, PaginatedResponse


router = APIRouter(prefix="/api/v1/admin/ai", tags=["Admin · AI"])


@router.get("/analytics", response_model=AdminAIAnalyticsResponse)
def ai_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    total_sessions = db.query(func.count(AIChatSession.id)).scalar() or 0

    empty_sessions_subq = (
        db.query(AIChatSession.id)
        .outerjoin(AIChatMessage, AIChatMessage.session_id == AIChatSession.id)
        .group_by(AIChatSession.id)
        .having(func.count(AIChatMessage.id) == 0)
        .subquery()
    )
    empty_sessions = db.query(func.count()).select_from(empty_sessions_subq).scalar() or 0

    total_messages = db.query(func.count(AIChatMessage.id)).scalar() or 0
    user_messages = (
        db.query(func.count(AIChatMessage.id))
        .filter(AIChatMessage.role == "user")
        .scalar()
        or 0
    )
    ai_messages = (
        db.query(func.count(AIChatMessage.id))
        .filter(AIChatMessage.role == "ai")
        .scalar()
        or 0
    )

    user_texts = [
        row.text for row in db.query(AIChatMessage.text).filter(
            AIChatMessage.role == "user"
        ).all()
    ]
    counter = Counter(t.strip().lower()[:120] for t in user_texts if t)
    top_prompts = [
        AdminAITopPrompt(text=text, count=count)
        for text, count in counter.most_common(10)
    ]

    return AdminAIAnalyticsResponse(
        total_sessions=total_sessions,
        empty_sessions=empty_sessions,
        total_messages=total_messages,
        user_messages=user_messages,
        ai_messages=ai_messages,
        top_prompts=top_prompts,
    )


@router.get("/sessions", response_model=PaginatedResponse[AdminAISessionItem])
def list_sessions(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    user_id: int | None = Query(default=None),
    only_empty: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
):
    msg_count = (
        func.count(AIChatMessage.id).label("message_count")
    )

    query = (
        db.query(
            AIChatSession,
            User.name.label("user_name"),
            User.email.label("user_email"),
            msg_count,
        )
        .outerjoin(User, User.id == AIChatSession.user_id)
        .outerjoin(AIChatMessage, AIChatMessage.session_id == AIChatSession.id)
        .group_by(AIChatSession.id, User.name, User.email)
    )

    if user_id is not None:
        query = query.filter(AIChatSession.user_id == user_id)

    if only_empty:
        query = query.having(func.count(AIChatMessage.id) == 0)

    total = query.count()

    rows = (
        query.order_by(AIChatSession.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AdminAISessionItem(
            id=session.id,
            user_id=session.user_id,
            user_name=user_name,
            user_email=user_email,
            title=session.title,
            preview=session.preview,
            message_count=message_count,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
        for session, user_name, user_email, message_count in rows
    ]

    return PaginatedResponse[AdminAISessionItem].build(
        items=items, total=total, page=page, page_size=page_size
    )


@router.get("/sessions/{session_id}/messages", response_model=list[AdminAIMessageItem])
def get_session_messages(
    session_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    session = db.query(AIChatSession).filter(AIChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(AIChatMessage)
        .filter(AIChatMessage.session_id == session_id)
        .order_by(AIChatMessage.created_at.asc())
        .all()
    )
    return [AdminAIMessageItem.model_validate(m) for m in messages]


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    session = db.query(AIChatSession).filter(AIChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.flush()
    log_admin_action(
        db, admin,
        action="ai.session.delete",
        entity_type="ai_session",
        entity_id=str(session_id),
        description=f"Удалена AI-сессия '{session.title}'",
    )
    db.commit()
    return MessageResponse(message="Session deleted")


@router.post("/sessions/cleanup-empty", response_model=MessageResponse)
def cleanup_empty_sessions(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    empty_session_ids = [
        row.id
        for row in (
            db.query(AIChatSession.id)
            .outerjoin(AIChatMessage, AIChatMessage.session_id == AIChatSession.id)
            .group_by(AIChatSession.id)
            .having(func.count(AIChatMessage.id) == 0)
            .all()
        )
    ]

    if not empty_session_ids:
        return MessageResponse(message="Нет пустых сессий")

    db.query(AIChatSession).filter(AIChatSession.id.in_(empty_session_ids)).delete(
        synchronize_session=False
    )

    log_admin_action(
        db, admin,
        action="ai.cleanup_empty",
        entity_type="ai_session",
        description=f"Удалено пустых AI-сессий: {len(empty_session_ids)}",
        payload={"count": len(empty_session_ids)},
    )

    db.commit()
    return MessageResponse(message=f"Удалено пустых сессий: {len(empty_session_ids)}")
