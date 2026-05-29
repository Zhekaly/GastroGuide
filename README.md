# GastroGuide

GastroGuide is a mobile application for discovering and exploring restaurants, cafes, and food places in Astana, Kazakhstan. The project combines a mobile client, a FastAPI backend, a local ML-based assistant, restaurant data management, route building, user authentication, reviews, favorites, and an administrative web panel.

The main goal of GastroGuide is to help users quickly find a suitable place to eat based on location, cuisine, dish, price range, mood, working hours, offers, and other practical preferences.

---

## Main Features

- Restaurant and cafe discovery in Astana
- Interactive map with restaurant markers
- Restaurant details with menu, photos, offers, address, rating, and working hours
- Search and filtering by name, cuisine, category, distance, and other criteria
- Nearby restaurant search based on user coordinates
- Route building to selected restaurants through OpenRouteService
- User registration and login
- JWT access and refresh token authentication
- Guest mode for browsing without an account
- Favorites for authenticated users
- Reviews and ratings
- Profile management and profile statistics
- Local ML-based chat assistant for restaurant recommendations
- AI chat history for authenticated users
- Admin web panel for managing restaurants, menu items, offers, reviews, users, categories, and system data

---

## Tech Stack

### Mobile Frontend

- React Native
- Expo
- Expo Router
- TypeScript
- React Navigation
- React Native Maps
- Expo Location
- AsyncStorage

### Backend

- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy ORM
- Alembic migrations
- Pydantic
- JWT authentication with `python-jose`
- Password hashing with `bcrypt` / `passlib`
- OpenRouteService API for route building
- Cloudflare R2 integration for image storage in admin workflows

### ML Assistant

- scikit-learn
- joblib
- rapidfuzz
- Local intent classification model
- Rule-based entity extraction
- Restaurant recommendation scoring
- Russian-language response generation

### Admin Panel

- Next.js 15
- App Router
- TypeScript
- TailwindCSS
- shadcn/ui components
- TanStack Table
- React Query
- Axios
- Leaflet / React Leaflet

---

## Project Structure

```text
GastroGuide/
├── GastroGuide-Backend/          # FastAPI backend, PostgreSQL models, API routes, ML assistant
│   ├── alembic/                  # Database migrations
│   ├── app/
│   │   ├── api/                  # Public mobile API routers and admin API routers
│   │   ├── core/                 # Configuration, database, security, maintenance helpers
│   │   ├── ml/                   # Local ML assistant pipeline
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── scripts/              # Utility scripts, including admin creation
│   │   ├── services/             # Business/service helpers
│   │   └── main.py               # FastAPI application entry point
│   ├── alembic.ini
│   ├── .env.example
│   ├── .gitignore
│   ├── requirements.txt
│   └── README.md
│
├── GastroGuide-FrontEnd/         # Mobile application built with Expo and React Native
│   ├── app/                      # Expo Router screens and layouts
│   │   ├── (tabs)/               # Main tab navigation
│   │   ├── _layout.tsx           # Root layout
│   │   ├── detail.tsx            # Restaurant detail screen
│   │   ├── edit-profile.tsx      # Profile editing screen
│   │   ├── index.tsx             # Initial redirect/entry screen
│   │   └── onboarding.tsx        # Authentication/onboarding screen
│   ├── assets/                   # App icons and images
│   ├── components/               # Reusable UI components
│   ├── constants/                # Theme and constants
│   ├── services/                 # API clients and domain service modules
│   ├── utils/                    # Formatting and helper utilities
│   ├── package.json
│   ├── .gitignore
│   └── README.md
│
├── GastroGuide-Admin/            # Web admin panel built with Next.js
│   ├── app/                      # Next.js App Router pages and layouts
│   ├── components/               # UI, layout, table, map, and form components
│   ├── lib/                      # API client, auth helpers, hooks, providers, utilities
│   ├── package.json
│   ├── .gitignore
│   └── README.md
│
├── .gitignore
└── README.md
```

---

## Environment Variables

The backend requires a `.env` file inside `GastroGuide-Backend/`.

Example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/gastroguide_db
ORS_API_KEY=your_openrouteservice_api_key

SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_BASE_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
```

The admin panel requires a `.env.local` file inside `GastroGuide-Admin/`.

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

For the mobile frontend, the API URL is detected automatically in local Expo development when possible. If needed, it can be overridden through:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

For testing on a physical phone, the backend must be accessible from the same local network.

---

## Getting Started

### 1. Backend

```bash
cd GastroGuide-Backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

For mobile testing through Expo Go on a physical phone:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### 2. Mobile Frontend

```bash
cd GastroGuide-FrontEnd
npm install
npx expo start
```

Then open the application through Expo Go, Android emulator, iOS simulator, or web mode depending on the development environment.

---

### 3. Admin Panel

```bash
cd GastroGuide-Admin
npm install
cp .env.local.example .env.local
npm run dev
```

Admin panel URL:

```text
http://localhost:3001
```

The admin panel communicates with the FastAPI backend through `/api/v1/admin/*` endpoints.

---

## AI Assistant

The assistant works through a local ML pipeline and does not require an external LLM API for normal operation.

The request flow is:

1. **Intent classification** — a trained scikit-learn model predicts the user's intent.
2. **Entity extraction** — keyword dictionaries and rules extract cuisines, dishes, price markers, mood markers, features, time markers, and location-related phrases.
3. **Recommendation scoring** — restaurants are ranked using a weighted scoring function based on intent, extracted entities, availability, distance, rating, price, offers, and other attributes.
4. **Response building** — the backend returns a Russian-language answer and a list of recommended restaurant cards.

When the user's coordinates are provided, distance is calculated and used in the recommendation ranking.

---

## Authentication

- JWT Bearer access token
- Refresh token mechanism
- Password hashing
- Guest browsing mode
- Authenticated user features:
  - favorites
  - reviews
  - profile editing
  - AI chat history
- Admin and moderator roles for the web admin panel

---

## Main API Areas

- `/api/v1/auth/*` — user authentication
- `/api/v1/users/*` — current user data
- `/api/v1/profile/*` — profile and profile statistics
- `/api/v1/restaurants/*` — restaurant search, detail, menu, nearby search
- `/api/v1/categories/*` — restaurant categories
- `/api/v1/favorites/*` — favorite restaurants
- `/api/v1/reviews/*` — user reviews
- `/api/v1/offers/*` — restaurant offers
- `/api/v1/routes/*` — route building
- `/api/v1/chat` — local ML assistant
- `/api/v1/ai/*` — AI chat sessions and messages
- `/api/v1/admin/*` — admin panel API

---

## Current Project Status

Implemented:

- Mobile frontend for restaurant browsing, map, search, profile, favorites, reviews, and AI assistant
- FastAPI backend with PostgreSQL integration
- Alembic migrations
- JWT authentication
- Local ML assistant pipeline
- Restaurant, menu, offer, category, review, favorite, and profile APIs
- Route building through OpenRouteService
- Admin panel for managing system data
- Image upload support for admin workflows through Cloudflare R2

Not included in the current version:

- Production deployment configuration
- Full Docker-based infrastructure
- PostGIS-based geospatial queries
- Payment or reservation system
