# GastroGuide Backend

Backend часть мобильного приложения **GastroGuide** — гастрономического навигатора по заведениям общепита в Астане.

## Реализованный функционал

На текущем этапе backend поддерживает:

- регистрацию и вход пользователей
- JWT access / refresh tokens
- получение текущего пользователя
- профиль пользователя и статистику профиля
- работу с избранными заведениями
- категории заведений
- отзывы пользователей
- AI-чат с сохранением истории для авторизованных пользователей
- AI nearby-рекомендации по координатам пользователя
- маршруты до заведений
- список заведений, меню и акции
- nearby-поиск по координатам
- миграции Alembic
- Swagger API документацию

## Технологии

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- Uvicorn
- Google Gemini API
- OpenRouteService API

## Структура проекта

```text
gastroguide-backend/
│
├── alembic/
│   ├── versions/
│   └── env.py
│
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── alembic.ini
├── .env
├── .env.example
├── requirements.txt
└── README.md
````

## База данных

Проект использует PostgreSQL.

Текущие таблицы:

* `restaurants`
* `menu_items`
* `offers`
* `users`
* `favorites`
* `reviews`
* `categories`
* `ai_chat_sessions`
* `ai_chat_messages`
* `alembic_version`

---

## Создание базы данных

Открой PostgreSQL и создай базу данных, например:

```sql
CREATE DATABASE gastroguide_db;
```

---

## Настройка `.env`

Создай файл `.env` в корне проекта:

```env
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/gastroguide_db
GEMINI_API_KEY=your_gemini_api_key
ORS_API_KEY=your_openrouteservice_api_key

SECRET_KEY=super_secret_key_change_me_123456789
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## Установка зависимостей

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## Инициализация и миграции БД

Если Alembic уже настроен, примени миграции:

```bash
alembic upgrade head
```

Если вносятся изменения в модели и создается новая миграция:

```bash
alembic revision --autogenerate -m "migration_name"
alembic upgrade head
```

---

## Локальный запуск backend

Для обычной локальной разработки:

```bash
uvicorn app.main:app --reload
```

Swagger будет доступен по адресу:

```text
http://127.0.0.1:8000/docs
```

---

## Локальный запуск backend для теста с телефона

Если frontend запускается на телефоне через Expo Go, backend нужно запускать так:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Тогда backend будет доступен по локальному IP ПК.

Пример:

```text
http://192.168.1.78:8000/docs
```

---

## Интеграция с frontend

### Для запуска frontend на ПК

Во frontend в `services/api.ts`:

```ts
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";
```

### Для запуска frontend на телефоне

Во frontend нужно указать локальный IP ПК:

```ts
const API_BASE_URL = "http://192.168.1.78:8000/api/v1";
```

Узнать IP можно командой:

```bash
ipconfig
```

И использовать значение `IPv4 Address`.

---

## Тестовые данные для БД

### Категории

Пример наполнения таблицы `categories`:

```sql
INSERT INTO categories (label, sort_order) VALUES
('Казахская', 1),
('Японская', 2),
('Итальянская', 3),
('Кофейня', 4),
('Азиатская', 5),
('Гриль', 6),
('Вегетарианская', 7);
```

### Привязка ресторанов к категориям

Пример:

```sql
UPDATE restaurants SET category_id = 1 WHERE type ILIKE '%Казах%';
UPDATE restaurants SET category_id = 2 WHERE type ILIKE '%Япон%';
UPDATE restaurants SET category_id = 3 WHERE type ILIKE '%Италь%';
UPDATE restaurants SET category_id = 4 WHERE type ILIKE '%Коф%';
UPDATE restaurants SET category_id = 5 WHERE type ILIKE '%Азиат%';
UPDATE restaurants SET category_id = 6 WHERE type ILIKE '%Гриль%';
UPDATE restaurants SET category_id = 7 WHERE type ILIKE '%Вегет%';
```

### Тестовый пользователь

Создать пользователя можно через API:

```http
POST /api/v1/auth/register
```

Пример body:

```json
{
  "name": "Test",
  "email": "test@example.com",
  "password": "12345678",
  "city": "Астана"
}
```

### Тестовые рестораны, меню и акции

Если таблицы `restaurants`, `menu_items` и `offers` уже заполнены вручную через SQL или PgAdmin, можно использовать их как mock-данные для тестирования frontend и backend.

---

## Основные endpoints

### Auth

* `POST /api/v1/auth/register`
* `POST /api/v1/auth/login`
* `POST /api/v1/auth/refresh`

### Users / Profile

* `GET /api/v1/users/me`
* `GET /api/v1/profile/me`
* `PATCH /api/v1/profile/me`
* `GET /api/v1/profile/stats`

### Favorites

* `GET /api/v1/favorites`
* `POST /api/v1/favorites/{restaurant_id}`
* `DELETE /api/v1/favorites/{restaurant_id}`

### Categories

* `GET /api/v1/categories`

### Reviews

* `GET /api/v1/reviews/{restaurant_id}`
* `POST /api/v1/reviews/{restaurant_id}`
* `PATCH /api/v1/reviews/{restaurant_id}`
* `DELETE /api/v1/reviews/{restaurant_id}`

### Restaurants

* `GET /api/v1/restaurants`
* `GET /api/v1/restaurants/{id}`
* `GET /api/v1/restaurants/{id}/menu`
* `GET /api/v1/restaurants/search?q=...`
* `GET /api/v1/restaurants/nearby?lat=...&lng=...&radius=...`

### Offers

* `GET /api/v1/offers`
* `GET /api/v1/offers/{id}`
* `GET /api/v1/restaurants/{id}/offer`

### AI

* `POST /api/v1/ai/chat`
* `GET /api/v1/ai/sessions`
* `POST /api/v1/ai/sessions`
* `GET /api/v1/ai/sessions/{session_id}/messages`

### Routes

* `GET /api/v1/routes?originLat=...&originLng=...&destLat=...&destLng=...&mode=...`

---

## Текущее состояние проекта

### Реализовано

* backend + frontend для локальной работы
* PostgreSQL + Alembic
* auth и профиль
* favorites
* reviews
* categories
* AI history
* AI nearby
* маршруты
* карта
* nearby search по координатам

### Пока не реализовано

* PostGIS
* production deploy
* полноценный Docker-стек
* роли и permissions