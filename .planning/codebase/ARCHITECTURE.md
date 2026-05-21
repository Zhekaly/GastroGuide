<!-- refreshed: 2026-05-21 -->
# Architecture

**Analysis Date:** 2026-05-21

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Client Layer                                      │
├──────────────────────────┬──────────────────────────────────────────┤
│  GastroGuide-FrontEnd    │       GastroGuide-Admin                  │
│  React Native / Expo     │       Next.js (App Router)               │
│  `GastroGuide-FrontEnd/` │       `GastroGuide-Admin/`               │
│  services/api.ts         │       lib/api/client.ts                  │
│  (Bearer via AsyncStorage│       (Bearer via cookie gg_admin_access)│
└──────────┬───────────────┴────────────────┬─────────────────────────┘
           │  HTTP /api/v1/...              │  HTTP /api/v1/admin/...
           ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                GastroGuide-Backend (FastAPI)                         │
│   `GastroGuide-Backend/app/main.py`                                  │
│                                                                      │
│   Public routers (`app/api/`)         Admin routers                  │
│   /restaurants  /auth  /chat          (`app/api/admin/`)             │
│   /reviews  /favorites  /offers       /restaurants /users /menu      │
│   /profile  /categories               /reviews /offers /ai /system   │
│                                                                      │
│   app/api/deps.py  ← JWT auth (get_current_user / get_optional_user)│
│                                                                      │
│   app/services/  ← domain service helpers                            │
│   app/ml/        ← NLP pipeline (chat only)                          │
└──────────────────────────────┬───────────────────────────────────────┘
                               │  SQLAlchemy ORM
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                          │
│  `app/core/database.py`  — engine + SessionLocal + Base              │
│  `alembic/`              — schema migrations                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| FastAPI app | CORS, router registration, startup hooks | `GastroGuide-Backend/app/main.py` |
| Public routers | Mobile-client REST endpoints under `/api/v1` | `GastroGuide-Backend/app/api/*.py` |
| Admin routers | Admin panel REST endpoints under `/api/v1/admin` | `GastroGuide-Backend/app/api/admin/*.py` |
| deps.py | JWT Bearer dependency injection (`get_current_user`, `get_optional_user`) | `GastroGuide-Backend/app/api/deps.py` |
| domain services | Business logic helpers (distance, opening-hours, rating, R2 upload) | `GastroGuide-Backend/app/services/` |
| SQLAlchemy models | ORM table definitions | `GastroGuide-Backend/app/models/` |
| Pydantic schemas | Request/response validation shapes | `GastroGuide-Backend/app/schemas/` |
| ML pipeline | Rule-based NLP chat: intent → entity → recommend → respond | `GastroGuide-Backend/app/ml/` |
| Frontend screens | File-based Expo Router screens (tabs + modal + detail) | `GastroGuide-FrontEnd/app/` |
| Frontend services | One file per resource, all HTTP via `api.ts` | `GastroGuide-FrontEnd/services/` |
| Admin pages | Next.js App Router pages under route groups | `GastroGuide-Admin/app/` |
| Admin API client | Universal fetch wrapper (server + client cookie auth) | `GastroGuide-Admin/lib/api/client.ts` |
| Admin endpoints | Typed endpoint functions per resource | `GastroGuide-Admin/lib/api/endpoints.ts` |

## Pattern Overview

**Overall:** Three-tier, resource-per-file REST API with a layered NLP pipeline for chat.

**Key Characteristics:**
- Backend follows FastAPI Depends injection: every endpoint declares its DB session and optional/required user via `Depends(get_db)` / `Depends(get_current_user)`.
- Each router file owns one resource domain (e.g., `app/api/restaurants.py`, `app/api/reviews.py`).
- Admin routes are a parallel namespace — separate router files under `app/api/admin/`, separate Pydantic schemas under `app/schemas/admin/`, and a separate `app/api/admin/deps.py`.
- Frontend and Admin never share code. Both call the same backend but are completely independent projects.
- No GraphQL, no WebSockets. All communication is plain JSON REST.

## Layers

**Router Layer:**
- Purpose: Parse HTTP request, validate input with Pydantic, call services/ORM, return response schema.
- Location: `GastroGuide-Backend/app/api/`
- Contains: `APIRouter` instances, endpoint functions, inline Pydantic request bodies
- Depends on: `app/api/deps.py`, `app/services/`, `app/models/`, `app/schemas/`
- Used by: `app/main.py` (registered via `app.include_router`)

**Dependency Layer:**
- Purpose: Provide DB session and authenticated user objects to routers via FastAPI `Depends`.
- Location: `GastroGuide-Backend/app/api/deps.py` (public), `GastroGuide-Backend/app/api/admin/deps.py` (admin)
- Contains: `get_db`, `get_current_user`, `get_optional_user`
- Depends on: `app/core/database.py`, `app/core/config.py`, `app/models/user.py`

**Service Layer:**
- Purpose: Reusable domain logic not tied to HTTP.
- Location: `GastroGuide-Backend/app/services/`
- Contains: `distance_service.py`, `location_service.py`, `opening_hours_service.py`, `rating_service.py`, `r2_service.py`
- Depends on: `app/models/`, `app/core/config.py`
- Used by: routers and the ML pipeline

**Model Layer:**
- Purpose: SQLAlchemy ORM table definitions.
- Location: `GastroGuide-Backend/app/models/`
- Contains: `Restaurant`, `User`, `Category`, `MenuItem`, `Offer`, `Review`, `Favorite`, `AIChatSession`, `AIChatMessage`, `ActivityLog`
- Depends on: `app/core/database.py` (Base)

**Schema Layer:**
- Purpose: Pydantic request/response shapes for serialization and validation.
- Location: `GastroGuide-Backend/app/schemas/` (public) and `GastroGuide-Backend/app/schemas/admin/` (admin)

**ML Layer:**
- Purpose: NLP chat pipeline — intent classification, entity extraction, restaurant scoring, response generation.
- Location: `GastroGuide-Backend/app/ml/`
- Contains: `intent_classifier.py`, `entity_extractor.py`, `pipeline.py`, `recommender.py`, `response_builder.py`, `data/*.json`
- Depends on: `app/models/`, `app/services/location_service.py`, `app/services/opening_hours_service.py`
- Used by: `app/api/chat.py` exclusively

**Core Layer:**
- Purpose: Application-wide config, DB connection, security utilities.
- Location: `GastroGuide-Backend/app/core/`
- Contains: `config.py` (Pydantic Settings), `database.py` (engine + SessionLocal + Base), `security.py` (JWT helpers), `db_maintenance.py` (sequence sync)

## Data Flow

### Backend: Standard REST Request Path

1. HTTP request hits FastAPI app (`GastroGuide-Backend/app/main.py`)
2. FastAPI resolves `Depends` — `get_db()` opens a SQLAlchemy session; `get_current_user()` or `get_optional_user()` decodes JWT from `Authorization: Bearer` header (`app/api/deps.py`)
3. Router endpoint function runs (`app/api/<resource>.py`) — queries models, calls service helpers if needed
4. Pydantic response model serializes result (`app/schemas/<resource>.py`)
5. FastAPI returns JSON; session closes in `get_db()` finally block

### Backend: Chat / ML Request Path (`POST /api/v1/chat`)

1. Request arrives at `app/api/chat.py` — resolved with optional user via `get_optional_user`
2. `get_pipeline()` returns the module-level `ChatPipeline` singleton (`app/ml/pipeline.py`)
3. `ChatPipeline.process()` runs the NLP pipeline:
   a. `IntentClassifier.predict(message)` → intent + confidence (`app/ml/intent_classifier.py`; sklearn `intent_clf.joblib`; falls back to `"fallback"` below threshold 0.35)
   b. All visible restaurants loaded from DB (`Restaurant.is_hidden == False`)
   c. `EntityExtractor.extract(message, restaurant_names, intent)` → typed entities dataclass (`app/ml/entity_extractor.py`; reads `app/ml/data/*.json`)
   d. Intent-specific early returns for `info_restaurant`, `working_hours`, `fallback`
   e. Candidate filtering (cuisine, offer, night)
   f. `score_restaurants(db, candidates, entities, ...)` → ranked list with score breakdowns (`app/ml/recommender.py`)
   g. Post-filter passes (cuisine/dish relevance, feature match, dish strict filter, price limit, superlative)
   h. `build_response(intent, entities, ranked, ...)` builds Russian-language text (`app/ml/response_builder.py`)
4. If user is authenticated, conversation turn persisted to `AIChatSession` / `AIChatMessage`
5. `ChatResponse` schema returned: `{answer, session_id, intent, intent_confidence, recommended_ids, recommended_restaurants}`

### Frontend to Backend

1. Screen calls a service function, e.g., `restaurants.getAll()` in `GastroGuide-FrontEnd/services/restaurants.ts`
2. Service function calls `api.get(url, auth?)` or `api.post(url, body, auth?)` from `GastroGuide-FrontEnd/services/api.ts`
3. `api.ts` resolves `BASE_URL`:
   - `EXPO_PUBLIC_API_URL` env var if set
   - Expo debugger host auto-detection (`Constants.expoConfig.hostUri`)
   - Hardcoded fallback `http://10.50.75.126:8000/api/v1`
4. If `auth=true`, `storage.getAccessToken()` retrieves JWT from AsyncStorage (`GastroGuide-FrontEnd/services/storage.ts`) and injects `Authorization: Bearer <token>` header
5. `fetch()` sends request; 401 responses clear stored tokens
6. No global interceptor — auth flag is per-call

### Admin to Backend

1. Page component or Server Component calls an endpoint function from `GastroGuide-Admin/lib/api/endpoints.ts`
2. Endpoint function calls `apiFetch(path, init)` from `GastroGuide-Admin/lib/api/client.ts`
3. `apiFetch` resolves `ADMIN_API_BASE = NEXT_PUBLIC_API_URL + /api/v1/admin` (`GastroGuide-Admin/lib/api/config.ts`)
4. Token read from `gg_admin_access` cookie — server-side via `next/headers` cookies(), client-side via `document.cookie`
5. `Authorization: Bearer <token>` injected; `cache: "no-store"` on all requests
6. Route protection enforced by `GastroGuide-Admin/middleware.ts` — unauthenticated requests to protected paths redirect to `/login`

**State Management:**
- Frontend: no global state library. Each screen manages its own `useState`/`useEffect`. AsyncStorage (via `services/storage.ts`) for auth tokens only.
- Admin: no global state library. Server Components fetch directly; client components use local state.
- Backend: stateless per-request; only global state is the `ChatPipeline` singleton and the sklearn classifier singleton in `app/ml/intent_classifier.py`.

## Key Abstractions

**ChatPipeline (singleton):**
- Purpose: Orchestrates the full NLP path from raw text to ranked restaurant recommendations
- File: `GastroGuide-Backend/app/ml/pipeline.py`
- Pattern: Module-level singleton via `get_pipeline()`; created once on first `/chat` request

**IntentClassifier (singleton):**
- Purpose: Wraps the joblib sklearn pipeline; maps Russian text to one of 10 intents
- File: `GastroGuide-Backend/app/ml/intent_classifier.py`
- Pattern: Module-level `_classifier` loaded lazily via `get_classifier()`
- Artefact: `GastroGuide-Backend/app/ml/models/intent_clf.joblib` — do not retrain

**Restaurant (ORM model):**
- Purpose: Central domain object; nearly every query touches this table
- File: `GastroGuide-Backend/app/models/restaurant.py`
- Key columns: `is_hidden`, `features: ARRAY(String)`, `photos: ARRAY(String)`, `mood_tags: ARRAY(String)`, `is_24_7`, `opens_at`/`closes_at`, `price_range`, `category_id`

**api.ts (Frontend HTTP client):**
- Purpose: Single fetch wrapper with auto-URL resolution and per-request auth injection
- File: `GastroGuide-FrontEnd/services/api.ts`
- Exports: `api.get`, `api.post`, `api.patch`, `api.delete`, legacy aliases `apiGet`, `apiPost`, `apiPatch`, `apiDelete`

**apiFetch (Admin HTTP client):**
- Purpose: Universal fetch wrapper that works in both Next.js Server Components and client components
- File: `GastroGuide-Admin/lib/api/client.ts`
- Pattern: Reads JWT from cookie; auto-detects server vs. client environment

## Entry Points

**Backend:**
- Location: `GastroGuide-Backend/app/main.py`
- Triggers: `uvicorn app.main:app`
- Responsibilities: Creates `FastAPI` app, applies CORS middleware, registers all routers, runs `sync_id_sequences()` on startup

**Frontend:**
- Location: `GastroGuide-FrontEnd/app/_layout.tsx`
- Triggers: `npx expo start`
- Responsibilities: Root stack navigator, sets `initialRouteName: 'onboarding'`, provides theme context

**Admin:**
- Location: `GastroGuide-Admin/app/layout.tsx` (root), `GastroGuide-Admin/middleware.ts` (auth guard)
- Triggers: `next dev` / `next build`
- Responsibilities: Root HTML shell + providers; middleware redirects unauthenticated users to `/login`

## Architectural Constraints

- **Threading:** Backend is single-process async (uvicorn); SQLAlchemy sessions are synchronous (not async). The ML pipeline runs synchronously inside the async endpoint with `await` not used — acceptable because sklearn inference is CPU-bound and fast.
- **Global state:** Two module-level singletons: `_pipeline_instance` in `app/ml/pipeline.py` and `_classifier` in `app/ml/intent_classifier.py`. Module-level caches also in `app/ml/recommender.py` and `app/ml/response_builder.py` — these are **never hot-reloaded**; server restart required after editing `app/ml/data/*.json`.
- **Circular imports:** None detected. `app/core/` has no upward imports; models import only from `app/core/database.py`.
- **Deprecated code:** `app/api/ai.py` and `app/services/ai_service.py` are deprecated Gemini wrappers — do not touch. The active AI endpoint is `app/api/chat.py` only.
- **Admin auth separation:** Admin JWT is entirely separate from user JWT. Admin tokens use `app/api/admin/deps.py`, not `app/api/deps.py`.

## Anti-Patterns

### Inline component in screen file

**What happens:** `RestaurantCardItem` component is defined inline inside `GastroGuide-FrontEnd/app/(tabs)/ai.tsx` rather than in `components/`.
**Why it's wrong:** Prevents reuse from other screens; makes the file harder to navigate.
**Do this instead:** Extract to `GastroGuide-FrontEnd/components/RestaurantCardItem.tsx` and import it.

### Hardcoded fallback IP in api.ts

**What happens:** `GastroGuide-FrontEnd/services/api.ts` falls back to `http://10.50.75.126:8000/api/v1` when Expo host detection fails.
**Why it's wrong:** Only works on the original developer's network; breaks for all other testers.
**Do this instead:** Set `EXPO_PUBLIC_API_URL` in `.env` before device testing; do not rely on the hardcoded fallback.

### Commented-out error handler block

**What happens:** `GastroGuide-FrontEnd/services/api.ts` contains a full commented-out `if (!response.ok)` block immediately above the active one (lines 66–82).
**Why it's wrong:** Dead code clutters the file and creates confusion about which error path is active.
**Do this instead:** Remove the commented block; the active block below it is the canonical error handler.

## Error Handling

**Strategy:** Raise `HTTPException` in routers; catch at FastAPI framework level.

**Patterns:**
- Routers raise `HTTPException(status_code=404, detail="...")` for not-found, `401` for auth failures.
- `app/api/deps.py` raises `401` when JWT validation fails; `get_optional_user` returns `None` instead of raising.
- ML pipeline returns structured dicts with empty `recommended_ids` and a Russian error message in `answer` — never raises HTTP errors directly.
- Admin client (`lib/api/client.ts`) throws `ApiError(status, detail)` on non-2xx; pages catch these inline.
- Frontend `api.ts` throws `Error(message)` on non-2xx; clears tokens on 401.

## Cross-Cutting Concerns

**Logging:** `logging.basicConfig` in `app/main.py`; ML pipeline uses named logger `logging.getLogger("gastroguide.ml")` at INFO with explicit handler to survive uvicorn root-logger configuration.
**Validation:** Pydantic v2 models for all HTTP request/response shapes. SQLAlchemy mapped columns for DB constraints.
**Authentication:** Two separate JWT flows — mobile users (Bearer token in header, `app/api/deps.py`) and admin users (Bearer token from `gg_admin_access` cookie, `app/api/admin/deps.py`). Access tokens validated with `python-jose`; `SECRET_KEY` and `ALGORITHM` from `app/core/config.py`.
**CORS:** Wildcard `allow_origins=["*"]` in `app/main.py` — acceptable for a student project, must be restricted before production deployment.

---

*Architecture analysis: 2026-05-21*
