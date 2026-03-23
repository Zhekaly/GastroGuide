# API endpoint для AI-ассистента GastroGuide.
# Файл принимает сообщение пользователя, историю диалога и координаты,
# а затем возвращает ответ AI с учётом базы заведений, избранного и nearby-контекста.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import google.api_core.exceptions

from app.schemas.ai import AIRequest, AIResponse
from app.services.ai_service import generate_ai_response
from app.core.database import get_db

from app.api.deps import get_current_user, get_optional_user
from app.models.ai_chat_message import AIChatMessage
from app.models.ai_chat_session import AIChatSession
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant
from app.models.user import User

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

@router.post("/chat", response_model=AIResponse)
def chat_ai(
    request: AIRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    try:
        favorites = []

        if current_user:
            favorites = (
                db.query(Restaurant)
                .join(Favorite, Favorite.restaurant_id == Restaurant.id)
                .filter(Favorite.user_id == current_user.id)
                .all()
            )

        # Если пользователь не авторизован — AI работает без сохранения истории
        if not current_user:
            answer = generate_ai_response(
                message=request.message,
                history=request.history,
                favorites=favorites,
                db=db,
                lat=request.lat,
                lng=request.lng,
                radius=request.radius,
            )
            return {"response": answer}

        session = None

        # Если передан session_id — продолжаем существующую сессию
        if request.session_id:
            session = (
                db.query(AIChatSession)
                .filter(
                    AIChatSession.id == request.session_id,
                    AIChatSession.user_id == current_user.id,
                )
                .first()
            )

            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

        # Если session_id нет — создаём новую сессию
        else:
            session = AIChatSession(
                user_id=current_user.id,
                title=request.message[:50],
                preview=None,
            )
            db.add(session)
            db.commit()
            db.refresh(session)

        # Сохраняем сообщение пользователя
        user_message = AIChatMessage(
            session_id=session.id,
            role="user",
            text=request.message,
        )
        db.add(user_message)

        # Генерируем AI-ответ
        answer = generate_ai_response(
            message=request.message,
            history=request.history,
            favorites=favorites,
            db=db,
            lat=request.lat,
            lng=request.lng,
            radius=request.radius,
        )

        # Сохраняем ответ AI
        ai_message = AIChatMessage(
            session_id=session.id,
            role="ai",
            text=answer,
        )
        db.add(ai_message)

        # Обновляем preview сессии
        session.preview = answer[:120]

        db.commit()

        return {"response": answer}

    except google.api_core.exceptions.GoogleAPIError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal AI error: {str(e)}")