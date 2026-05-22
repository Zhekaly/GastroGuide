# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GastroGuide is a restaurant-finder app for Astana. Three sub-projects share this repo:

| Directory | Stack |
|---|---|
| `GastroGuide-Backend/` | FastAPI + SQLAlchemy + PostgreSQL |
| `GastroGuide-FrontEnd/` | React Native + Expo Router (iOS/Android) |
| `GastroGuide-Admin/` | Next.js admin panel |

---

## Backend

### Setup & run

```bash
cd GastroGuide-Backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY, etc.

# Run dev server
uvicorn app.main:app --reload

# Run on local network (for mobile testing)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI: `http://127.0.0.1:8000/docs`

### Database migrations

```bash
alembic upgrade head                                  # apply all migrations
alembic revision --autogenerate -m "describe change"  # generate from model diff
alembic downgrade -1                                  # rollback one step
```

All models must be imported in `alembic/env.py` for autogenerate to detect them. On startup the app calls `sync_id_sequences(engine)` to fix PostgreSQL sequences after manual seed imports.

### Required `.env` keys

```
DATABASE_URL=postgresql://...
ORS_API_KEY=...           # OpenRouteService for map routing
SECRET_KEY=...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=...
REFRESH_TOKEN_EXPIRE_DAYS=...
# Optional — Cloudflare R2 (admin photo uploads only)
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL
```

### API layout

Public (mobile) routes are registered in `app/main.py` with prefix `/api/v1`. Admin routes live under `app/api/admin/` and have their own auth.

The **active AI endpoint** is `POST /api/v1/chat` (`app/api/chat.py`). The AI chat runs entirely on the local ML pipeline in `app/ml/` — no external LLM API is used.

JWT auth: `Bearer` access tokens, verified in `app/api/deps.py`. Use `get_current_user` for required auth and `get_optional_user` for optional auth (e.g. the chat endpoint personalises results when a user is logged in but still works anonymously).

---

## ML Pipeline

The entire NLP stack lives in `app/ml/`. It is a **rule-based pipeline** — the only trained artefact is `app/ml/models/intent_clf.joblib`.

### Data flow

```
user text
  └─► IntentClassifier.predict()         intent_classifier.py
        └─► EntityExtractor.extract()    entity_extractor.py  (reads data/*.json)
              └─► ChatPipeline.process() pipeline.py
                    ├─► score_restaurants()   recommender.py
                    └─► build_*_response()    response_builder.py
```

`get_pipeline()` in `pipeline.py` returns a module-level singleton — `ChatPipeline` is created once per process.

### Intent classifier

- File: `app/ml/models/intent_clf.joblib` — sklearn `Pipeline` (TfidfVectorizer → LinearSVC → CalibratedClassifierCV)
- **Never retrain or replace this file** unless you re-verify all 10 intents end-to-end
- `CONFIDENCE_THRESHOLD = 0.35` in `intent_classifier.py`; below this the pipeline returns `"fallback"`
- Supported intents: `search_by_dish`, `search_by_cuisine`, `search_by_mood`, `search_by_price`, `search_by_offer`, `search_nearby`, `search_24_7`, `info_restaurant`, `working_hours`, `fallback`

### Extending without retraining

All `app/ml/data/*.json` files are plain Russian keyword dictionaries loaded once at startup. **Restart the server after any edit.** Module-level caches in `recommender.py` and `response_builder.py` are never hot-reloaded.

- `cuisine_keywords.json` — keys are **exact DB `category.label` values** for the 9 categories (Казахская, Японская, Итальянская, Гриль, Вегетарианская, Кофейня, Азиатская, ЗОЖ, Семейное). The cuisine filter in `pipeline.py` does `entities.cuisine.lower()[:7] in category.label.lower()`.
- `attribute_keywords.json` — matched to `entities.attribute`; used in both scoring and dish selection
- `dish_to_menu.json` — maps a dish keyword to synonyms that appear in `menu_items.name`
- `feature_keywords.json` — maps feature labels to text patterns checked against `restaurant.features[]`

### Invariants — do not change

- `/chat` response schema: `{answer, session_id, intent, intent_confidence, recommended_ids, recommended_restaurants}`
- All user-facing strings stay in **Russian**
- Rating display: `★` symbol; distances: `м` / `км`
- ML logger name: `logging.getLogger("gastroguide.ml")` at INFO
- Cuisine matching uses `category.label` only — never `restaurant.description`

### Recommender weights

Weights are in `WEIGHTS` dict in `recommender.py`. `pipeline.py` overrides per-intent (e.g. `search_by_dish` bumps `menu_match` to 6.0). Tuning is done by editing those dicts, not retraining.

---

## Database Schema (key facts)

`Restaurant` columns worth knowing: `is_hidden` (filtered out everywhere as `filter(Restaurant.is_hidden == False)`), `features: ARRAY(String)`, `photos: ARRAY(String)`, `mood_tags: ARRAY(String)` (nullable — mood scoring is a stub until this is populated), `is_24_7`, `opens_at`/`closes_at` (Time), `price_range` (int 1–4), `category_id → Category`.

Category IDs: `1=Казахская 2=Японская 3=Итальянская 4=Гриль 5=Вегетарианская 6=Кофейня 7=Азиатская 8=ЗОЖ 9=Семейное`

---

## Frontend

### Run

```bash
cd GastroGuide-FrontEnd
npm install
npx expo start          # Expo Go / development build
npx expo run:ios        # native iOS build
npx expo run:android    # native Android build
npx expo lint           # ESLint via expo lint
```

### API URL resolution

`services/api.ts` resolves the backend URL automatically:

1. `EXPO_PUBLIC_API_URL` env var (override for CI/prod)
2. Expo debugger host auto-detection (works with `npx expo start` on LAN)
3. Hardcoded fallback `http://10.50.75.126:8000/api/v1`

For device testing without Expo Go, set `EXPO_PUBLIC_API_URL=http://<your-machine-ip>:8000/api/v1`.

### App architecture

Expo Router file-based routing. All screens are in `app/`:

- `app/(tabs)/` — bottom tab navigator: `index.tsx` (home), `ai.tsx` (AI chat), `map.tsx`, `search.tsx`, `profile.tsx`
- `app/detail.tsx` — restaurant detail, receives `id` param via `router.push({ pathname: '/detail', params: { id } })`
- `app/onboarding.tsx` / `app/index.tsx` — entry and onboarding flow

### Services layer

All API calls go through `services/api.ts` which exposes `api.get()`, `api.post()`, `api.put()`, `api.delete()`, and `apiPost()` helpers. Auth tokens are stored via `services/storage.ts` (AsyncStorage). Token injection is done per-request with `auth: true` flag — there is **no global Axios interceptor**.

### RestaurantCardItem component

Lives inline in `app/(tabs)/ai.tsx` (not a separate file). Renders the horizontal scroll cards below AI chat messages. The `tag` field is displayed as an absolute-positioned badge on the photo area (`rc.tagBadge` style), not prepended to the name. Navigate to detail via `router.push({ pathname: '/detail', params: { id: card.id } })`.

### Design tokens

`constants/theme.ts` has the colour palette. Common inline constants in screen files use a local `const C = { bg, dark, accent, muted, border, ... }` pattern — update both `theme.ts` and the local `C` object when changing colours.
