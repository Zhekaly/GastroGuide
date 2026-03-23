# Импорт всех SQLAlchemy-моделей проекта.
# Используется для корректной регистрации metadata
# и последующей работы Alembic с миграциями.

from app.models.restaurant import Restaurant
from app.models.menu_item import MenuItem
from app.models.offer import Offer
from app.models.category import Category
from app.models.user import User
from app.models.review import Review
from app.models.favorite import Favorite
from app.models.ai_chat_session import AIChatSession
from app.models.ai_chat_message import AIChatMessage