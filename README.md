# GastroGuide

GastroGuide is a mobile application for discovering and exploring restaurants in Astana, Kazakhstan. It features an AI assistant powered by a custom ML model, an interactive map, favorites, reviews, and full user authentication.

---

## Tech Stack

### Frontend
- React Native + Expo Router (file-based navigation)
- TypeScript
- Libraries: `expo-location`, `react-native-safe-area-context`, `@expo/vector-icons`

### Backend
- Python 3.11+ + FastAPI
- PostgreSQL + SQLAlchemy ORM
- scikit-learn — custom ML model for the AI assistant (intent classification + recommender)
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
    │   │   ├── chat.py
    │   │   └── ai_history.py
    │   ├── models/             # SQLAlchemy models
    │   ├── schemas/            # Pydantic schemas
    │   ├── services/           # Domain service helpers
    │   │   └── location_service.py  # Haversine distance
    │   └── ml/                 # Local ML chat pipeline (intent + recommender)
```

---

## Environment Variables

Create a `.env` file in the backend root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/gastroguide

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

The assistant runs entirely on a local ML pipeline built with scikit-learn — no external LLM API is used. Each request flows through four stages:

1. **Intent classification** — a trained scikit-learn model maps the user's message to one of 10 intents (search by dish, cuisine, mood, price, offer, nearby, 24/7, restaurant info, working hours, or fallback).
2. **Entity extraction** — rule-based keyword matching extracts dishes, cuisines, attributes, and features from the message.
3. **Recommendation scoring** — visible restaurants are ranked by a weighted scoring function.
4. **Response building** — a Russian-language answer is generated together with the ranked restaurant cards.

When the user's coordinates are provided, distance is calculated using the Haversine formula and factored into the ranking.

---

## Authentication

- JWT Bearer access token + refresh token
- Guest mode — browse restaurants without an account
- Authenticated features: favorites, reviews, AI chat history, profile editing
