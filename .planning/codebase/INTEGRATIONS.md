# External Integrations

**Analysis Date:** 2026-05-21

---

## Data Storage

### PostgreSQL

**Type:** Relational database — primary data store for all application data.

**Used by:** GastroGuide-Backend exclusively. Frontend and Admin communicate with the database only via the API.

**Client / ORM:**
- SQLAlchemy 2.0.48 (ORM + Core)
- psycopg2-binary 2.9.11 (sync driver)
- Engine created in `GastroGuide-Backend/app/core/database.py`: `create_engine(settings.database_url)`
- Session dependency (`get_db`) provided to all endpoints via FastAPI `Depends`

**Migrations:**
- Alembic 1.18.4 manages schema migrations
- Apply: `alembic upgrade head`
- Generate: `alembic revision --autogenerate -m "describe change"`
- All models must be imported in `alembic/env.py` for autogenerate detection

**Startup maintenance:**
- `app/core/db_maintenance.py` — `sync_id_sequences(engine)` runs on startup to fix PostgreSQL sequences after manual seed imports; called in `app/main.py` `on_startup` handler

**Configuration:**
- Env var: `DATABASE_URL` (required)
- Format: `postgresql://user:password@host:port/dbname`

**Tables (models in `app/models/`):**
- `restaurant.py` — `Restaurant`: core entity; includes `is_hidden`, `features ARRAY`, `photos ARRAY`, `mood_tags ARRAY`, `is_24_7`, `opens_at`/`closes_at`, `price_range`, `category_id`
- `category.py` — 9 cuisine categories (IDs 1–9)
- `user.py`, `favorite.py`, `review.py`, `menu_item.py`, `offer.py`
- `ai_chat_session.py`, `ai_chat_message.py` — chat history persistence
- `activity_log.py` — admin audit log

---

## Authentication & Identity

### JWT Authentication (Custom — no third-party auth service)

**Backend implementation:** `GastroGuide-Backend/app/core/security.py`

- Library: `python-jose` 3.5.0
- Password hashing: `passlib` 1.7.4 with bcrypt scheme (`bcrypt` 4.0.1)
- Token types: access token (short-lived) + refresh token (long-lived)
- Algorithm: configured via `ALGORITHM` env var (default `HS256`)
- Signing secret: `SECRET_KEY` env var

**Token issuance:**
- `create_access_token(subject)` — encodes `{"sub": user_id, "type": "access", "exp": ...}`
- `create_refresh_token(subject)` — encodes `{"sub": user_id, "type": "refresh", "exp": ...}`
- TTL controlled by `ACCESS_TOKEN_EXPIRE_MINUTES` and `REFRESH_TOKEN_EXPIRE_DAYS`

**Auth endpoints:** `GastroGuide-Backend/app/api/auth.py` (public mobile)
**Admin auth endpoints:** `GastroGuide-Backend/app/api/admin/auth.py`

**Request auth guard:**
- `app/api/deps.py` — `get_current_user` (required), `get_optional_user` (chat endpoint uses this: authenticated users get personalised results, anonymous users still work)
- `app/api/admin/deps.py` — separate admin auth guard

**Mobile frontend (`GastroGuide-FrontEnd`):**
- Tokens stored in AsyncStorage via `services/storage.ts` (`access_token`, `refresh_token` keys)
- Injected per-request: `api.get(url, auth=true)` passes `Authorization: Bearer <token>` header in `services/api.ts`
- No global interceptor — auth flag is explicit on each call

**Admin panel (`GastroGuide-Admin`):**
- Tokens stored in cookies: `gg_admin_access` and `gg_admin_refresh`
- Cookie names defined in `lib/api/config.ts`
- Server-side token read (Next.js Server Components): `lib/auth/server.ts` uses `next/headers` `cookies()`
- Client-side token read: `lib/api/client.ts` parses `document.cookie`
- Route protection: `middleware.ts` + `lib/auth/middleware-config.ts`

---

## APIs & External Services

### OpenRouteService (ORS) — Map Routing

**Purpose:** Calculate walking/driving routes between a user's location and a restaurant.

**Used by:** GastroGuide-Backend only.

**Implementation:** `GastroGuide-Backend/app/api/routes.py`

**API call pattern:**
```
POST https://api.openrouteservice.org/v2/directions/{mode}/geojson
Authorization: <ORS_API_KEY>
Body: { "coordinates": [[lng, lat], [lng, lat]] }
```

- `mode` query param defaults to `foot-walking`; also supports other ORS profiles
- Endpoint registered at `GET /api/v1/routes` with query params `originLat`, `originLng`, `destLat`, `destLng`, `mode`
- Returns `{ distance, duration, geometry }` mapped from ORS GeoJSON feature summary

**Configuration:**
- Env var: `ORS_API_KEY` (required)
- HTTP client: `requests` library (synchronous), 30-second timeout

**Frontend consumer:** `GastroGuide-FrontEnd/services/routes.ts`

---

### Cloudflare R2 — Photo Storage

**Purpose:** Object storage for restaurant photo uploads made through the admin panel. S3-compatible API.

**Used by:** GastroGuide-Backend (upload endpoint); GastroGuide-Admin triggers uploads via the API.

**Implementation:** `GastroGuide-Backend/app/services/r2_service.py`

**Upload endpoint:** `GastroGuide-Backend/app/api/admin/upload.py`

**Client:** boto3 1.35.49 with custom S3 endpoint

**Configuration pattern:**
```python
boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(signature_version="s3v4"),
)
```

**Key upload behavior:**
- Allowed content types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`
- Key format: `restaurants/{uuid4_hex}{ext}` (stored in `folder/` prefix)
- `CacheControl: public, max-age=31536000, immutable` set on every upload
- Returns `UploadedImage(url, key, content_type, size)` — `url` is `{R2_PUBLIC_BASE_URL}/{key}`

**Graceful degradation:** If R2 env vars are absent, `R2NotConfiguredError` is raised. Admin UI can fall back to manual URL entry.

**Configuration — all optional (R2 disabled if any is missing):**
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

**Admin UI consumer:** `GastroGuide-Admin/components/forms/photo-uploader.tsx`

---

### Google Gemini — DEPRECATED

**Status:** Integrated but unused by the active request pipeline. Do not call these files from new code.

**Deprecated files:**
- `GastroGuide-Backend/app/services/ai_service.py` — imports `google.generativeai`, configures `gemini-2.5-flash`, and defines `generate_ai_response()`. This function is NOT called by `app/api/chat.py`.
- `GastroGuide-Backend/app/services/ai.py` — additional legacy wrapper
- `GastroGuide-Backend/app/api/ai.py` — legacy AI endpoint router (deprecated)
- `GastroGuide-Backend/app/api/admin/ai.py` — admin AI router (may reference legacy service)

**Active AI endpoint:** `POST /api/v1/chat` in `GastroGuide-Backend/app/api/chat.py` — uses the local ML pipeline (`app/ml/pipeline.py`), not Gemini.

**Why still installed:** `google-generativeai 0.8.6` and all Google auth packages remain in `requirements.txt`. The `GEMINI_API_KEY` env var is loaded at startup by `app/core/config.py` (marked as required, not optional — removing it without updating `config.py` will cause startup failure).

**Risk:** `app/services/ai_service.py` calls `genai.configure(api_key=settings.gemini_api_key)` at module import time. If `GEMINI_API_KEY` is missing from `.env`, startup will fail even though Gemini is not used.

---

## Expo Services

### Expo SDK (Mobile App)

**Used by:** GastroGuide-FrontEnd exclusively.

**Services consumed:**

| Module | Version | Purpose |
|---|---|---|
| `expo` | ~54.0.33 | Core SDK, build toolchain, Expo Go |
| `expo-router` | ~6.0.23 | File-based routing (entry point) |
| `expo-location` | ~19.0.8 | Device GPS; used in map and nearby restaurant features |
| `expo-constants` | ~18.0.13 | Reads `expoConfig.hostUri` for LAN API URL auto-detection |
| `expo-splash-screen` | ~31.0.13 | Splash screen management |
| `expo-font` | ~14.0.11 | Custom font loading at startup |
| `expo-haptics` | ~15.0.8 | Haptic feedback on tab navigation |
| `expo-image` | ~3.0.11 | Optimized image loading/caching |
| `expo-linking` | ~8.0.11 | Deep link handling |
| `expo-web-browser` | ~15.0.10 | OAuth/external URL browser |
| `expo-system-ui` | ~6.0.9 | System UI color configuration |
| `expo-status-bar` | ~3.0.9 | Status bar styling |

**API URL auto-detection (important for local dev):**
`GastroGuide-FrontEnd/services/api.ts` resolves the backend URL in this order:
1. `EXPO_PUBLIC_API_URL` env var (CI/production override)
2. `Constants.expoConfig.hostUri` — Expo debugger host for LAN connections
3. Legacy manifest fields (`manifest.debuggerHost`, `manifest2.extra.expoGo.debuggerHost`)
4. Hardcoded fallback `http://10.50.75.126:8000/api/v1`

**No Expo push notifications, EAS Build, or Expo Updates** detected in current source.

---

## Map Rendering (Frontend Clients)

### React Native Maps (Mobile)

- Package: `react-native-maps` 1.20.1
- Used in: `GastroGuide-FrontEnd/app/(tabs)/map.tsx`
- Renders native Apple Maps (iOS) / Google Maps (Android)

### Leaflet (Admin Web)

- Packages: `leaflet` 1.9.4 + `react-leaflet` 4.2.1
- Used in: `GastroGuide-Admin/components/maps/map-picker.tsx` and `map-picker-dynamic.tsx`
- Dynamically imported (Next.js SSR-safe): `map-picker-dynamic.tsx` wraps map picker with `next/dynamic`
- Purpose: coordinate picker when creating/editing a restaurant

### Google Maps Web API (FrontEnd web target)

- Package: `@react-google-maps/api` ^2.20.8
- Used for web platform target only within the React Native app (Expo web build)

---

## Monitoring & Observability

**Error Tracking:** None detected (no Sentry, Datadog, etc.)

**Logging (Backend):**
- Standard Python `logging` module; configured in `app/main.py`
- Format: `%(asctime)s | %(levelname)s | %(message)s`
- ML-specific logger: `logging.getLogger("gastroguide.ml")` — always set to INFO, separate handler, does not propagate to root logger
- No structured logging or external log aggregation detected

**Logging (Frontend/Admin):** `console.log` only; no external service

---

## CI/CD & Deployment

**Hosting:** Not detected — no `Dockerfile`, `fly.toml`, `vercel.json`, `railway.toml`, or equivalent found in source.

**CI Pipeline:** Not detected — no `.github/workflows/`, `.gitlab-ci.yml`, or similar.

**Swagger UI:** Available at `http://127.0.0.1:8000/docs` when backend is running.

**Health endpoints:**
- `GET /` — returns `{"message": "GastroGuide Backend is running"}`
- `GET /health` — returns database configuration status
- `GET /db-check` — executes `SELECT 1` and returns connection status

---

## CORS Configuration

Configured in `GastroGuide-Backend/app/main.py`:
```python
CORSMiddleware(
    allow_origins=["*"],   # currently open to all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`ADMIN_CORS_ORIGINS` env var is loaded in `config.py` (default: `http://localhost:3000,http://localhost:3001`) but the active middleware uses `["*"]`.

---

*Integration audit: 2026-05-21*
