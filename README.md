# GastroGuide

GastroGuide is a mobile application for discovering and exploring restaurants in Astana, Kazakhstan. It features an AI assistant powered by Google Gemini, an interactive map, favorites, reviews, and full user authentication.

---

## Tech Stack

### Frontend
- React Native + Expo Router (file-based navigation)
- TypeScript
- Libraries: `expo-location`, `react-native-safe-area-context`, `@expo/vector-icons`

### Backend
- Python 3.11+ + FastAPI
- PostgreSQL + SQLAlchemy ORM
- Google Gemini 2.5 Flash — AI assistant
- JWT (access + refresh tokens) via `python-jose`
- bcrypt for password hashing
- OpenRouteService API — route building

---

## Project Structure

```
gastroguide/
├── app/                        # Frontend (Expo Router)
│   ├── _layout.tsx             # Root layout (Stack)
│   ├── index.tsx               # Entry point, redirect logic
│   ├── onboarding.tsx          # Onboarding / auth screen
│   ├── detail.tsx              # Restaurant detail page
│   ├── edit-profile.tsx        # Edit profile screen
│   └── (tabs)/
│       ├── _layout.tsx         # Tab navigation layout
│       ├── index.tsx           # Home feed
│       ├── search.tsx          # Search and filtering
│       ├── map.tsx             # Restaurant map
│       ├── ai.tsx              # AI chat assistant
│       └── profile.tsx         # User profile
│
└── backend/
    ├── main.py                 # FastAPI entry point
    ├── app/
    │   ├── core/
    │   │   ├── config.py       # Settings loaded from .env
    │   │   ├── database.py     # SQLAlchemy engine + get_db
    │   │   └── security.py     # JWT + bcrypt
    │   ├── api/                # FastAPI routers
    │   │   ├── auth.py
    │   │   ├── restaurants.py
    │   │   ├── categories.py
    │   │   ├── favorites.py
    │   │   ├── profile.py
    │   │   ├── reviews.py
    │   │   ├── offers.py
    │   │   ├── routes.py
    │   │   ├── ai.py
    │   │   └── ai_history.py
    │   ├── models/             # SQLAlchemy models
    │   ├── schemas/            # Pydantic schemas
    │   └── services/
    │       ├── ai_service.py        # AI logic (Gemini)
    │       └── location_service.py  # Haversine distance
```

---

## Environment Variables

Create a `.env` file in the backend root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/gastroguide

GEMINI_API_KEY=your_gemini_api_key
ORS_API_KEY=your_openrouteservice_api_key

SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API available at `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd app
npm install
npx expo start
```


## AI Assistant

The assistant is powered by Google Gemini 2.5 Flash. On each request it receives the following context:

- **Restaurant database** — name, type, rating, menu items, active offers
- **Conversation history** — up to the last 10 messages in the session
- **User favorites** — for personalized recommendations
- **Nearby context** — restaurants within a configurable radius (default 2 km) based on the user's coordinates

Distance is calculated using the Haversine formula.

---

## Authentication

- JWT Bearer access token + refresh token
- Guest mode — browse restaurants without an account
- Authenticated features: favorites, reviews, AI chat history, profile editing
