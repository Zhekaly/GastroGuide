# GastroGuide Backend

The backend part of the **GastroGuide** mobile application — a gastronomic navigator for food service places in Astana.

The backend provides a REST API for the mobile application and the admin panel, works with PostgreSQL, stores data about restaurants, menus, offers, users, favorites, reviews, and AI chat history, and also contains a local ML pipeline for restaurant recommendations.

---

## Implemented Functionality

At the current stage, the backend supports:

- user registration and login
- JWT access / refresh tokens
- retrieving the current user
- user profile and profile statistics
- user roles: `user`, `admin`, `moderator`
- favorite restaurants
- restaurant categories
- user reviews
- restaurant list, menu items, and offers
- nearby search by coordinates
- routes to restaurants through OpenRouteService
- local ML chat for restaurant recommendations
- saving AI chat history for authenticated users
- admin API for the web admin panel
- management of restaurants, menu items, offers, reviews, users, and categories through the admin API
- image upload for the admin panel through Cloudflare R2
- Alembic migrations
- Swagger API documentation
- health-check and database connection check

---

## Technologies

- Python 3.11+
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- Uvicorn
- JWT authentication through `python-jose`
- Password hashing through `bcrypt` / `passlib`
- scikit-learn — local ML model for the AI chat
- joblib — loading the trained model
- rapidfuzz — fuzzy matching for text processing
- OpenRouteService API — route building
- Cloudflare R2 / S3-compatible storage — image upload for the admin panel

---

## Project Structure

```text
GastroGuide-Backend/
│
├── alembic/
│   ├── versions/                # Alembic migration files
│   └── env.py                   # Alembic environment configuration
│
├── app/
│   ├── api/
│   │   ├── admin/               # Admin panel API routers
│   │   ├── auth.py              # User authentication
│   │   ├── users.py             # Current user endpoints
│   │   ├── profile.py           # Profile endpoints
│   │   ├── restaurants.py       # Restaurant search/detail/menu/nearby endpoints
│   │   ├── categories.py        # Category endpoints
│   │   ├── favorites.py         # Favorite restaurants
│   │   ├── reviews.py           # Reviews
│   │   ├── offers.py            # Offers
│   │   ├── routes.py            # Route building
│   │   ├── chat.py              # Local ML assistant endpoint
│   │   └── ai_history.py        # AI sessions and messages
│   │
│   ├── core/
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # SQLAlchemy engine, SessionLocal, Base
│   │   ├── db_maintenance.py    # PostgreSQL sequence synchronization
│   │   └── security.py          # JWT and password helpers
│   │
│   ├── ml/
│   │   ├── data/                # Keyword dictionaries and markers
│   │   ├── models/              # Trained ML model artifacts
│   │   ├── entity_extractor.py  # Entity extraction
│   │   ├── intent_classifier.py # Intent classification
│   │   ├── pipeline.py          # Main ML assistant pipeline
│   │   ├── recommender.py       # Restaurant scoring and ranking
│   │   └── response_builder.py  # Final answer generation
│   │
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic schemas
│   ├── scripts/                 # Utility scripts
│   ├── services/                # Service helpers
│   └── main.py                  # FastAPI entry point
│
├── alembic.ini
├── .env.example
├── requirements.txt
├── .gitignore
└── README.md
```

---

## Database

The project uses PostgreSQL.

Main tables:

- `restaurants`
- `menu_items`
- `offers`
- `users`
- `favorites`
- `reviews`
- `categories`
- `ai_chat_sessions`
- `ai_chat_messages`
- `restaurant_moderators`
- `activity_logs`
- `alembic_version`

---

## Creating the Database

Open PostgreSQL and create a database, for example:

```sql
CREATE DATABASE gastroguide_db;
```

---

## `.env` Configuration

Create a `.env` file in the root of `GastroGuide-Backend`.

Example for a local PostgreSQL database:

```env
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/gastroguide_db
ORS_API_KEY=your_openrouteservice_api_key

SECRET_KEY=super_secret_key_change_me_123456789
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_BASE_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
```

An example for Neon / cloud PostgreSQL can use the same format, but with a cloud connection string:

```env
DATABASE_URL=postgresql+psycopg2://user:password@host/database?sslmode=require
```

Cloudflare R2 variables are required for image uploads from the admin panel. If image upload is not used, these variables can be temporarily left empty as long as the related endpoints are not called.

---

## Installing Dependencies

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Database Initialization and Migrations

Apply existing migrations:

```bash
alembic upgrade head
```

If changes are made to the models and a new migration needs to be created:

```bash
alembic revision --autogenerate -m "migration_name"
alembic upgrade head
```

When the backend starts, it also synchronizes PostgreSQL sequences with the current `MAX(id)`. This protects against ID conflicts after manual data import or seed data insertion.

---

## Running the Backend Locally

For regular local development:

```bash
uvicorn app.main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Swagger will be available at:

```text
http://127.0.0.1:8000/docs
```

Health-check:

```text
http://127.0.0.1:8000/health
```

Database connection check:

```text
http://127.0.0.1:8000/db-check
```

---

## Running the Backend Locally for Testing on a Phone

If the frontend is launched on a phone through Expo Go, the backend should be started like this:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then the backend will be available through the local IP address of the PC.

Example:

```text
http://192.168.1.78:8000/docs
```

On Windows, the local IP address can be found with:

```bash
ipconfig
```

Use the `IPv4 Address` value of the active Wi-Fi network.

---

## Frontend Integration

The mobile frontend communicates with the backend through `/api/v1`.

### For running the frontend on PC / web

You can use:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

### For running the frontend on a phone

The backend must be started with `0.0.0.0`, and the frontend must use the computer's local IP address:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.78:8000/api/v1
```

If `EXPO_PUBLIC_API_URL` is not set, the frontend tries to detect the host automatically through Expo.

---

## Admin Panel Integration

The admin panel communicates with the backend through these endpoints:

```text
/api/v1/admin/*
```

In `GastroGuide-Admin/.env.local`, specify:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Creating the First Administrator

A user with the `admin` role is required to log in to the admin panel.

After applying migrations, an administrator can be created through the script:

```bash
python -m app.scripts.create_admin \
  --email admin@gastroguide.local \
  --password "SuperSecret123" \
  --name "Admin"
```

After that, it is possible to log in to the admin panel using the created administrator's email and password.

---

## Local ML Chat

The backend contains a local ML pipeline for restaurant recommendations.

Main message processing stages:

1. **Intent classification** — a scikit-learn model identifies the user's intent.
2. **Entity extraction** — dictionaries and rules extract dishes, cuisines, features, price markers, mood markers, opening-hour markers, nearby markers, and other entities.
3. **Recommendation scoring** — restaurants are ranked by relevance.
4. **Response building** — a Russian-language answer and a list of recommended restaurant cards are generated.

Main endpoint:

```http
POST /api/v1/chat
```

Example body:

```json
{
  "message": "Найди недорогое место рядом, где можно поесть пиццу",
  "session_id": null,
  "lat": 51.1282,
  "lng": 71.4304
}
```

Example response contains:

- `answer`
- `session_id`
- `intent`
- `intent_confidence`
- `recommended_ids`
- `recommended_restaurants`

---

## Test Data for the Database

### Categories

Example data for the `categories` table:

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

### Assigning Restaurants to Categories

Example:

```sql
UPDATE restaurants SET category_id = 1 WHERE type ILIKE '%Казах%';
UPDATE restaurants SET category_id = 2 WHERE type ILIKE '%Япон%';
UPDATE restaurants SET category_id = 3 WHERE type ILIKE '%Италь%';
UPDATE restaurants SET category_id = 4 WHERE type ILIKE '%Коф%';
UPDATE restaurants SET category_id = 5 WHERE type ILIKE '%Азиат%';
UPDATE restaurants SET category_id = 6 WHERE type ILIKE '%Гриль%';
UPDATE restaurants SET category_id = 7 WHERE type ILIKE '%Вегет%';
```

### Test User

A user can be created through the API:

```http
POST /api/v1/auth/register
```

Example body:

```json
{
  "name": "Test",
  "email": "test@example.com",
  "password": "12345678",
  "city": "Астана"
}
```

### Test Restaurants, Menu Items, and Offers

If the `restaurants`, `menu_items`, and `offers` tables have already been filled manually through SQL or PgAdmin, they can be used as test data for checking frontend and backend functionality.

---

## Main Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Users / Profile

- `GET /api/v1/users/me`
- `GET /api/v1/profile/me`
- `PATCH /api/v1/profile/me`
- `GET /api/v1/profile/stats`

### Favorites

- `GET /api/v1/favorites`
- `POST /api/v1/favorites/{restaurant_id}`
- `DELETE /api/v1/favorites/{restaurant_id}`

### Categories

- `GET /api/v1/categories`

### Reviews

- `GET /api/v1/reviews/{restaurant_id}`
- `POST /api/v1/reviews/{restaurant_id}`
- `PATCH /api/v1/reviews/{restaurant_id}`
- `DELETE /api/v1/reviews/{restaurant_id}`

### Restaurants

- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/{id}`
- `GET /api/v1/restaurants/{id}/menu`
- `GET /api/v1/restaurants/search?q=...`
- `GET /api/v1/restaurants/nearby?lat=...&lng=...&radius=...`

### Offers

- `GET /api/v1/offers`
- `GET /api/v1/offers/{id}`
- `GET /api/v1/restaurants/{id}/offer`

### AI / Chat

- `POST /api/v1/chat`
- `GET /api/v1/ai/sessions`
- `POST /api/v1/ai/sessions`
- `GET /api/v1/ai/sessions/{session_id}/messages`
- `DELETE /api/v1/ai/sessions/{session_id}`

### Routes

- `GET /api/v1/routes?originLat=...&originLng=...&destLat=...&destLng=...&mode=...`

### Admin API

- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/refresh`
- `GET /api/v1/admin/dashboard/*`
- `GET /api/v1/admin/restaurants`
- `POST /api/v1/admin/restaurants`
- `PATCH /api/v1/admin/restaurants/{id}`
- `DELETE /api/v1/admin/restaurants/{id}`
- `GET /api/v1/admin/menu-items`
- `GET /api/v1/admin/offers`
- `GET /api/v1/admin/reviews`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/categories`
- `GET /api/v1/admin/ai/*`
- `GET /api/v1/admin/system/*`
- `POST /api/v1/admin/upload/*`

The exact list of endpoints can be checked in Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## Current Project Status

### Implemented

- backend + frontend for local work
- PostgreSQL + Alembic
- auth and profile
- roles `user`, `admin`, `moderator`
- favorites
- reviews
- categories
- offers
- AI history
- local ML chat
- routes
- nearby search by coordinates
- admin API
- image upload through Cloudflare R2

### Not implemented yet / not included in the current version

- production deploy
- full Docker stack
- PostGIS
- payments
- table reservations
