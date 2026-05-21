# Technology Stack

**Analysis Date:** 2026-05-21

---

## Sub-project Overview

| Directory | Role |
|---|---|
| `GastroGuide-Backend/` | REST API + ML pipeline |
| `GastroGuide-FrontEnd/` | iOS/Android mobile app |
| `GastroGuide-Admin/` | Web admin panel |

---

## GastroGuide-Backend

### Language & Runtime

**Primary:**
- Python 3.13 — confirmed by `.venv/lib/python3.13/` path

**Package Manager:**
- pip
- Lockfile: `GastroGuide-Backend/requirements.txt` (pinned versions, no pyproject.toml)

### Frameworks

**Core API:**
- FastAPI 0.135.1 — REST API framework, all routes in `app/main.py`
- Starlette 0.52.1 — ASGI foundation (transitive FastAPI dependency)
- Uvicorn 0.41.0 — ASGI server; dev run: `uvicorn app.main:app --reload`

**Data Validation:**
- Pydantic 2.12.5 — request/response schemas in `app/schemas/`
- pydantic-settings 2.13.1 — settings loaded from `.env` in `app/core/config.py`

**Database:**
- SQLAlchemy 2.0.48 — ORM; models in `app/models/`; engine created in `app/core/database.py`
- psycopg2-binary 2.9.11 — PostgreSQL driver
- Alembic 1.18.4 — database migrations; config in `alembic/`

**Security:**
- python-jose 3.5.0 — JWT encode/decode in `app/core/security.py`
- passlib 1.7.4 / bcrypt 4.0.1 — password hashing (bcrypt scheme)
- cryptography 46.0.5 — cryptographic primitives

**HTTP Client:**
- requests 2.32.5 — used in `app/api/routes.py` to call OpenRouteService
- httpx 0.28.1 — available but not actively used in source routes

**Utilities:**
- python-dotenv 1.2.2 — `.env` loading
- python-multipart 0.0.22 — multipart form data (file uploads)
- email-validator 2.3.0 — email field validation in Pydantic schemas

### ML Stack

All ML code lives in `GastroGuide-Backend/app/ml/`.

**Core ML:**
- scikit-learn >= 1.3.0 — `sklearn.pipeline.Pipeline` (TfidfVectorizer → LinearSVC → CalibratedClassifierCV)
- joblib >= 1.3.0 — model serialization; trained artifact at `app/ml/models/intent_clf.joblib`
- numpy / scipy — transitive scikit-learn dependencies (installed in venv)

**NLP / Fuzzy Matching:**
- rapidfuzz >= 3.0.0 — fuzzy entity extraction in `app/ml/entity_extractor.py` (`fuzz`, `process`)

**Data Files (plain JSON, not models):**
- `app/ml/data/cuisine_keywords.json`
- `app/ml/data/attribute_keywords.json`
- `app/ml/data/dish_to_menu.json`
- `app/ml/data/feature_keywords.json`

**ML Pipeline Singleton:**
- `app/ml/pipeline.py` — `get_pipeline()` returns a module-level `ChatPipeline` instance (created once per process)
- `app/ml/intent_classifier.py` — loads `intent_clf.joblib` on first call; `CONFIDENCE_THRESHOLD = 0.35`

**Deprecated Gemini wrapper (do not use):**
- google-generativeai 0.8.6 — installed and imported in `app/services/ai_service.py`; model `gemini-2.5-flash` configured there; this file is NOT called by the active `/api/v1/chat` endpoint

**Object Storage Client:**
- boto3 1.35.49 / botocore 1.35.49 / s3transfer 0.10.3 — S3-compatible client used in `app/services/r2_service.py` for Cloudflare R2 uploads

### Build / Config Files

| File | Purpose |
|---|---|
| `GastroGuide-Backend/requirements.txt` | Pinned dependency list |
| `GastroGuide-Backend/app/core/config.py` | Pydantic Settings class, reads `.env` |
| `GastroGuide-Backend/alembic.ini` | Alembic migration config (if present) |
| `GastroGuide-Backend/app/main.py` | FastAPI app entry point; registers all routers |

### Environment Variables (Backend)

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `GEMINI_API_KEY` — legacy key, loaded at startup by `config.py` even though Gemini is unused
- `ORS_API_KEY` — OpenRouteService routing key
- `SECRET_KEY` — JWT signing secret
- `ALGORITHM` — JWT algorithm (default `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` — access token TTL
- `REFRESH_TOKEN_EXPIRE_DAYS` — refresh token TTL

Optional (Cloudflare R2):
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

Optional (CORS):
- `ADMIN_CORS_ORIGINS` — default `http://localhost:3000,http://localhost:3001`

---

## GastroGuide-FrontEnd

### Language & Runtime

**Primary:**
- TypeScript 5.9.2 — strict mode not explicitly set in tsconfig
- Node.js — runtime for Expo/Metro toolchain

**Package Manager:**
- npm (no lockfile committed; `package.json` in `GastroGuide-FrontEnd/`)

### Frameworks & Core Libraries

**Cross-platform Mobile:**
- React Native 0.81.5 — core mobile framework
- React 19.1.0 — UI rendering
- Expo ~54.0.33 — managed/bare workflow toolchain

**Navigation:**
- Expo Router ~6.0.23 — file-based routing; entry: `expo-router/entry` (set in `package.json` `"main"`)
- `@react-navigation/native` ^7.1.8, `@react-navigation/bottom-tabs` ^7.4.0 — underlying navigation primitives

**Key Expo SDK Modules:**
- `expo-location` ~19.0.8 — GPS coordinates for nearby search and map
- `expo-image` ~3.0.11 — optimized image rendering
- `expo-font` ~14.0.11 — custom font loading
- `expo-haptics` ~15.0.8 — haptic feedback on tab presses
- `expo-constants` ~18.0.13 — reads `expoConfig.hostUri` for API URL auto-detection
- `expo-splash-screen` ~31.0.13 — splash screen control
- `expo-linking` ~8.0.11 — deep linking
- `expo-web-browser` ~15.0.10 — in-app browser
- `expo-web-view` ^0.1.1 — WebView component

**Maps:**
- `react-native-maps` 1.20.1 — native map rendering (iOS/Android)
- `@react-google-maps/api` ^2.20.8 — Google Maps for web target

**UI & Animation:**
- `react-native-reanimated` ~4.1.1 — animations
- `react-native-gesture-handler` ~2.28.0 — gesture recognition
- `react-native-worklets` 0.5.1 — worklet execution
- `react-native-webview` 13.15.0 — web content embedding

**Persistence:**
- `@react-native-async-storage/async-storage` 2.2.0 — token storage; wrapper in `services/storage.ts`

**HTTP:**
- Native `fetch` API — used directly in `services/api.ts`; no Axios

**Icons:**
- `@expo/vector-icons` ^15.0.3

### Build / Config Files

| File | Purpose |
|---|---|
| `GastroGuide-FrontEnd/package.json` | Dependencies and scripts |
| `GastroGuide-FrontEnd/tsconfig.json` | TypeScript config |
| `GastroGuide-FrontEnd/app.json` / `app.config.js` | Expo app config (if present) |

### Environment Variables (FrontEnd)

- `EXPO_PUBLIC_API_URL` — overrides backend URL; resolution order: env var → Expo debugger host auto-detection → hardcoded fallback `http://10.50.75.126:8000/api/v1`

### Dev Commands

```bash
npx expo start            # Expo Go dev mode
npx expo run:ios          # native iOS build
npx expo run:android      # native Android build
npx expo lint             # ESLint via expo-config
```

---

## GastroGuide-Admin

### Language & Runtime

**Primary:**
- TypeScript 5.6.3 — strict mode enabled (`"strict": true` in `tsconfig.json`)
- Node.js — Next.js runtime

**Package Manager:**
- npm (no lockfile committed; `package.json` in `GastroGuide-Admin/`)

### Frameworks & Core Libraries

**Core:**
- Next.js 15.0.3 — App Router (`app/` directory); runs on port 3001
- React 18.3.1 — UI rendering
- react-dom 18.3.1

**Styling:**
- Tailwind CSS 3.4.14 — utility-first CSS; config in `GastroGuide-Admin/tailwind.config.ts`
- tailwind-merge 2.5.4 — conditional class merging
- tailwindcss-animate 1.0.7 — animation utilities
- class-variance-authority 0.7.0 — variant-based component styling

**UI Components:**
- Radix UI primitives — `@radix-ui/react-{avatar,checkbox,dialog,dropdown-menu,label,popover,select,separator,slot,switch,tabs,toast,tooltip}`
- lucide-react 0.454.0 — icon set
- sonner 1.7.0 — toast notifications

**Data Fetching & State:**
- `@tanstack/react-query` ^5.59.20 — server-state management; provider in `lib/providers.tsx`
- axios 1.7.7 — available in deps but primary fetching is done via custom `apiFetch` in `lib/api/client.ts`

**Tables:**
- `@tanstack/react-table` ^8.20.5 — data tables in `components/tables/data-table.tsx`

**Forms:**
- react-hook-form 7.53.2 — form state management
- `@hookform/resolvers` ^3.9.1 — Zod integration
- zod 3.23.8 — schema validation

**Maps:**
- leaflet 1.9.4 — map rendering for restaurant location picker
- react-leaflet 4.2.1 — React wrapper; used in `components/maps/map-picker.tsx`
- `@types/leaflet` ^1.9.14 — type definitions

**HTTP (internal):**
- Custom `apiFetch` in `lib/api/client.ts` — reads JWT from cookies; works server-side (Next.js `cookies()`) and client-side (`document.cookie`)

**Auth (Admin):**
- Cookie-based JWT — `gg_admin_access` and `gg_admin_refresh` cookie names defined in `lib/api/config.ts`
- Next.js middleware in `middleware.ts` — route protection via `lib/auth/middleware-config.ts`
- Server-side token read in `lib/auth/server.ts`

### Build / Config Files

| File | Purpose |
|---|---|
| `GastroGuide-Admin/package.json` | Dependencies and scripts |
| `GastroGuide-Admin/tsconfig.json` | TypeScript config; `@/*` alias to repo root |
| `GastroGuide-Admin/tailwind.config.ts` | Tailwind configuration |
| `GastroGuide-Admin/middleware.ts` | Next.js middleware for auth guards |
| `GastroGuide-Admin/next.config.*` | Next.js config (if present) |

### Environment Variables (Admin)

- `NEXT_PUBLIC_API_URL` — backend base URL; default `http://127.0.0.1:8000`; consumed in `lib/api/config.ts`

### Dev Commands

```bash
npm run dev       # Next.js dev server on port 3001
npm run build     # Production build
npm run start     # Production server on port 3001
npm run lint      # ESLint (next lint)
npm run typecheck # tsc --noEmit
```

---

*Stack analysis: 2026-05-21*
