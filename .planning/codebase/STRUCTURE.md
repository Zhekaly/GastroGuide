# Codebase Structure

**Analysis Date:** 2026-05-21

## Top-Level Layout

```
GastroGuide/
├── GastroGuide-Backend/    # Python FastAPI + SQLAlchemy + PostgreSQL
├── GastroGuide-FrontEnd/   # React Native + Expo Router (iOS/Android)
├── GastroGuide-Admin/      # Next.js admin panel
├── CLAUDE.md               # Project-wide architecture reference
└── .planning/              # GSD planning documents
    └── codebase/
```

---

## GastroGuide-Backend

### Directory Layout

```
GastroGuide-Backend/
├── app/
│   ├── main.py                     # FastAPI app factory, router registration, startup hook
│   ├── api/
│   │   ├── deps.py                 # get_db, get_current_user, get_optional_user
│   │   ├── auth.py                 # POST /api/v1/auth/login, /register, /refresh
│   │   ├── restaurants.py          # GET /api/v1/restaurants, /search, /{id}
│   │   ├── categories.py           # GET /api/v1/categories
│   │   ├── offers.py               # GET /api/v1/offers
│   │   ├── reviews.py              # GET/POST/DELETE /api/v1/reviews
│   │   ├── favorites.py            # GET/POST/DELETE /api/v1/favorites
│   │   ├── profile.py              # GET/PATCH /api/v1/profile
│   │   ├── users.py                # GET /api/v1/users/me
│   │   ├── chat.py                 # POST /api/v1/chat  ← active AI endpoint
│   │   ├── ai_history.py           # GET /api/v1/ai/sessions
│   │   ├── routes.py               # GET /api/v1/routes (ORS routing)
│   │   ├── ai.py                   # DEPRECATED Gemini wrapper — do not modify
│   │   └── admin/
│   │       ├── deps.py             # Admin-only auth dependency
│   │       ├── auth.py             # POST /api/v1/admin/auth/login
│   │       ├── dashboard.py        # GET /api/v1/admin/dashboard
│   │       ├── restaurants.py      # CRUD /api/v1/admin/restaurants
│   │       ├── menu_items.py       # CRUD /api/v1/admin/menu-items
│   │       ├── offers.py           # CRUD /api/v1/admin/offers
│   │       ├── reviews.py          # GET/DELETE /api/v1/admin/reviews
│   │       ├── users.py            # CRUD /api/v1/admin/users
│   │       ├── categories.py       # CRUD /api/v1/admin/categories
│   │       ├── ai.py               # GET /api/v1/admin/ai/analytics, sessions
│   │       ├── system.py           # GET /api/v1/admin/system/broken-restaurants, activity-log
│   │       └── upload.py           # POST /api/v1/admin/upload/image (R2)
│   ├── core/
│   │   ├── config.py               # Pydantic Settings (DATABASE_URL, SECRET_KEY, etc.)
│   │   ├── database.py             # engine, SessionLocal, Base, get_db
│   │   ├── security.py             # create_access_token, verify_password, hash_password
│   │   └── db_maintenance.py       # sync_id_sequences() — fixes PG sequences after seed
│   ├── models/
│   │   ├── __init__.py             # Re-exports all models (required by alembic/env.py)
│   │   ├── restaurant.py           # Restaurant ORM model
│   │   ├── user.py                 # User ORM model
│   │   ├── category.py             # Category ORM model
│   │   ├── menu_item.py            # MenuItem ORM model
│   │   ├── offer.py                # Offer ORM model
│   │   ├── review.py               # Review ORM model
│   │   ├── favorite.py             # Favorite ORM model
│   │   ├── ai_chat_session.py      # AIChatSession ORM model
│   │   ├── ai_chat_message.py      # AIChatMessage ORM model
│   │   └── activity_log.py         # ActivityLog ORM model
│   ├── schemas/
│   │   ├── restaurant.py           # RestaurantResponse, MenuItemResponse
│   │   ├── auth.py                 # LoginRequest, TokenResponse
│   │   ├── review.py               # ReviewCreate, ReviewResponse
│   │   ├── offer.py                # OfferResponse
│   │   ├── favorite.py             # FavoriteResponse
│   │   ├── profile.py              # ProfileUpdate, ProfileResponse
│   │   ├── category.py             # CategoryResponse
│   │   ├── ai.py                   # (legacy)
│   │   ├── ai_history.py           # AISessionResponse, AIMessageResponse
│   │   ├── route.py                # RouteResponse
│   │   └── admin/
│   │       ├── restaurant.py       # Admin restaurant schemas
│   │       ├── user.py             # Admin user schemas
│   │       ├── menu.py             # Admin menu schemas
│   │       ├── offer.py            # Admin offer schemas
│   │       ├── review.py           # Admin review schemas
│   │       ├── category.py         # Admin category schemas
│   │       ├── dashboard.py        # DashboardOverview schema
│   │       ├── ai.py               # AIAnalytics, AISession, AIMessage schemas
│   │       ├── system.py           # BrokenRestaurant, ActivityLog schemas
│   │       ├── auth.py             # AdminTokenResponse, AdminMe schemas
│   │       └── common.py           # Shared Paginated[T] schema
│   ├── services/
│   │   ├── distance_service.py     # apply_dynamic_distance_to_restaurant()
│   │   ├── location_service.py     # haversine_distance()
│   │   ├── opening_hours_service.py# is_restaurant_open(), apply_dynamic_open_status()
│   │   ├── rating_service.py       # recalculate_restaurant_rating()
│   │   ├── r2_service.py           # Cloudflare R2 upload helper
│   │   ├── ai.py                   # (legacy)
│   │   └── ai_service.py           # DEPRECATED Gemini wrapper — do not modify
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── pipeline.py             # ChatPipeline class + get_pipeline() singleton
│   │   ├── intent_classifier.py    # IntentClassifier wrapping sklearn joblib model
│   │   ├── entity_extractor.py     # EntityExtractor; reads data/*.json
│   │   ├── recommender.py          # score_restaurants(); WEIGHTS dict
│   │   ├── response_builder.py     # build_response(), build_*_response() helpers
│   │   ├── models/
│   │   │   └── intent_clf.joblib   # Trained sklearn Pipeline — DO NOT RETRAIN casually
│   │   └── data/
│   │       ├── cuisine_keywords.json    # Cuisine → DB category.label mapping
│   │       ├── attribute_keywords.json  # Attribute keywords for scoring
│   │       ├── dish_to_menu.json        # Dish keyword → menu_items.name synonyms
│   │       └── feature_keywords.json    # Feature labels → text patterns
│   └── scripts/
│       └── create_admin.py         # One-off CLI script to seed an admin user
├── alembic/
│   ├── env.py                      # Alembic env; imports all models for autogenerate
│   ├── alembic.ini                 # (root)
│   └── versions/                  # Migration files (*.py)
└── requirements.txt
```

### Key File Locations — Backend

**Entry Point:**
- `GastroGuide-Backend/app/main.py` — FastAPI app creation and router wiring

**Configuration:**
- `GastroGuide-Backend/app/core/config.py` — all env vars via Pydantic `Settings`
- `GastroGuide-Backend/.env` — local secrets (not committed); `.env.example` shows required keys

**Auth:**
- `GastroGuide-Backend/app/api/deps.py` — `get_current_user`, `get_optional_user`
- `GastroGuide-Backend/app/core/security.py` — token creation and password hashing

**Database:**
- `GastroGuide-Backend/app/core/database.py` — engine + `get_db` dependency
- `GastroGuide-Backend/alembic/versions/` — migration history

**ML pipeline (all files):**
- `GastroGuide-Backend/app/ml/pipeline.py` — orchestrator
- `GastroGuide-Backend/app/ml/intent_classifier.py` — sklearn wrapper
- `GastroGuide-Backend/app/ml/entity_extractor.py` — keyword entity extraction
- `GastroGuide-Backend/app/ml/recommender.py` — scoring with `WEIGHTS` dict
- `GastroGuide-Backend/app/ml/response_builder.py` — Russian response text builders
- `GastroGuide-Backend/app/ml/models/intent_clf.joblib` — trained artefact
- `GastroGuide-Backend/app/ml/data/*.json` — editable keyword dictionaries

---

## GastroGuide-FrontEnd

### Directory Layout

```
GastroGuide-FrontEnd/
├── app/
│   ├── _layout.tsx             # Root stack; sets initialRouteName: 'onboarding'
│   ├── index.tsx               # Redirect/splash (entry before onboarding check)
│   ├── onboarding.tsx          # Onboarding flow screen
│   ├── detail.tsx              # Restaurant detail screen (receives id param)
│   ├── edit-profile.tsx        # Edit profile screen
│   ├── modal.tsx               # Generic modal screen
│   └── (tabs)/
│       ├── _layout.tsx         # Bottom tab navigator (5 tabs)
│       ├── index.tsx           # Home tab — restaurant listing
│       ├── ai.tsx              # AI chat tab; contains inline RestaurantCardItem
│       ├── map.tsx             # Map tab
│       ├── search.tsx          # Search tab
│       └── profile.tsx         # Profile tab
├── components/
│   ├── external-link.tsx
│   ├── haptic-tab.tsx
│   ├── hello-wave.tsx
│   ├── parallax-scroll-view.tsx
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   └── ui/
│       ├── collapsible.tsx
│       ├── icon-symbol.tsx         # Cross-platform icon
│       └── icon-symbol.ios.tsx     # iOS-specific icon override
├── constants/
│   └── theme.ts                # Colour palette + design tokens
├── data/
│   └── restaurants.ts          # Static fallback restaurant data (dev only)
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   └── use-theme-color.ts
├── services/
│   ├── api.ts                  # Base HTTP client; URL resolution; auth injection
│   ├── storage.ts              # AsyncStorage wrapper for access/refresh tokens
│   ├── auth.ts                 # login(), register(), refreshToken(), logout()
│   ├── restaurants.ts          # getAll(), getById(), search()
│   ├── categories.ts           # (implied by API)
│   ├── offers.ts               # getOffers()
│   ├── favorites.ts            # getFavorites(), addFavorite(), removeFavorite()
│   ├── reviews.ts              # getReviews(), postReview()
│   ├── profile.ts              # getProfile(), updateProfile()
│   ├── routes.ts               # getRoute() — ORS routing
│   └── ai.ts                   # chat(), getAIHistory()
├── utils/
│   ├── format.ts               # Formatting helpers
│   └── restaurantImages.ts     # Local image map for static fallback
└── expo-env.d.ts               # Expo global type declarations
```

### Key File Locations — Frontend

**Root layout / navigation:**
- `GastroGuide-FrontEnd/app/_layout.tsx` — Stack root; sets initial screen to `onboarding`
- `GastroGuide-FrontEnd/app/(tabs)/_layout.tsx` — Bottom tab bar definition

**Screens:**
- `GastroGuide-FrontEnd/app/(tabs)/index.tsx` — Home / restaurant list
- `GastroGuide-FrontEnd/app/(tabs)/ai.tsx` — AI chat (contains inline `RestaurantCardItem`)
- `GastroGuide-FrontEnd/app/detail.tsx` — Restaurant detail; navigated to with `router.push({ pathname: '/detail', params: { id } })`

**HTTP layer:**
- `GastroGuide-FrontEnd/services/api.ts` — `api.get/post/patch/delete`; `EXPO_PUBLIC_API_URL` override; Expo host auto-detection; fallback `http://10.50.75.126:8000/api/v1`
- `GastroGuide-FrontEnd/services/storage.ts` — `getAccessToken()`, `setTokens()`, `clearTokens()`

**Design tokens:**
- `GastroGuide-FrontEnd/constants/theme.ts` — colour palette; screens also define a local `const C = { ... }` mirroring these values

---

## GastroGuide-Admin

### Directory Layout

```
GastroGuide-Admin/
├── app/
│   ├── layout.tsx                      # Root HTML + providers
│   ├── page.tsx                        # Root redirect (→ /dashboard)
│   ├── (auth)/
│   │   ├── layout.tsx                  # Auth layout (no sidebar)
│   │   └── login/page.tsx              # Login page
│   └── (dashboard)/
│       ├── layout.tsx                  # Dashboard shell: Sidebar + Navbar + <main>
│       ├── dashboard/page.tsx          # Overview stats
│       ├── restaurants/
│       │   ├── page.tsx                # Restaurant list with filters
│       │   ├── new/page.tsx            # Create restaurant form
│       │   └── [id]/page.tsx           # Edit restaurant form
│       ├── menu/page.tsx               # Menu items management
│       ├── offers/page.tsx             # Offers management
│       ├── reviews/page.tsx            # Review moderation
│       ├── users/page.tsx              # User management
│       ├── categories/page.tsx         # Category management
│       ├── ai/page.tsx                 # AI chat analytics + session viewer
│       └── system/page.tsx             # System tools (broken restaurants, activity log)
├── components/
│   ├── forms/
│   │   ├── restaurant-form.tsx         # Full restaurant create/edit form
│   │   ├── restaurant-menu-panel.tsx   # Inline menu items panel
│   │   ├── photo-uploader.tsx          # R2 photo upload widget
│   │   └── tag-input.tsx               # Tag/array field input
│   ├── layout/
│   │   ├── sidebar.tsx                 # Navigation sidebar
│   │   ├── navbar.tsx                  # Top navbar with admin info
│   │   └── global-search.tsx           # Global search bar
│   ├── maps/
│   │   ├── map-picker.tsx              # SSR-safe map picker wrapper
│   │   └── map-picker-dynamic.tsx      # Dynamically imported Leaflet map picker
│   ├── tables/
│   │   └── data-table.tsx              # Generic sortable/paginated table
│   └── ui/                             # shadcn/ui primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       ├── switch.tsx
│       └── textarea.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts           # apiFetch() — universal fetch with cookie auth
│   │   ├── config.ts           # ADMIN_API_BASE, cookie names, NEXT_PUBLIC_API_URL
│   │   ├── endpoints.ts        # Typed API functions per resource (authApi, restaurantsApi, etc.)
│   │   └── types.ts            # TypeScript interfaces for all API shapes
│   ├── auth/
│   │   ├── cookies.ts          # setAdminTokens(), clearAdminTokens()
│   │   ├── server.ts           # requireAdmin() — Server Component auth guard
│   │   └── middleware-config.ts# PROTECTED_PATH_PREFIXES list
│   ├── providers.tsx           # React context providers (QueryClient, Toaster, etc.)
│   └── utils.ts                # cn() className utility
├── middleware.ts               # Next.js edge middleware — redirect unauthenticated to /login
├── next.config.ts
└── tailwind.config.ts
```

### Key File Locations — Admin

**Auth guard:**
- `GastroGuide-Admin/middleware.ts` — edge middleware; checks `gg_admin_access` cookie
- `GastroGuide-Admin/lib/auth/server.ts` — `requireAdmin()` for Server Component-level auth
- `GastroGuide-Admin/lib/auth/middleware-config.ts` — list of protected path prefixes

**API layer:**
- `GastroGuide-Admin/lib/api/config.ts` — `ADMIN_API_BASE` = `NEXT_PUBLIC_API_URL + /api/v1/admin`
- `GastroGuide-Admin/lib/api/client.ts` — `apiFetch()` with `ApiError` class
- `GastroGuide-Admin/lib/api/endpoints.ts` — `authApi`, `dashboardApi`, `restaurantsApi`, `menuApi`, `offersApi`, `reviewsApi`, `usersApi`, `categoriesApi`, `aiApi`, `systemApi`, `uploadApi`
- `GastroGuide-Admin/lib/api/types.ts` — all TypeScript types matching backend Pydantic schemas

**Key pages:**
- `GastroGuide-Admin/app/(dashboard)/restaurants/[id]/page.tsx` — restaurant edit page
- `GastroGuide-Admin/app/(dashboard)/restaurants/new/page.tsx` — restaurant create page
- `GastroGuide-Admin/app/(dashboard)/system/page.tsx` — system health tools

---

## Naming Conventions

### Backend (Python)

**Files:**
- `snake_case.py` for all Python files
- One SQLAlchemy model per file, named after the domain noun: `restaurant.py`, `user.py`
- One router per file, named after the resource: `restaurants.py`, `reviews.py`
- Schema files mirror their router: `app/schemas/restaurant.py` for `app/api/restaurants.py`

**Python symbols:**
- Classes: `PascalCase` (e.g., `ChatPipeline`, `RestaurantResponse`)
- Functions/methods: `snake_case`
- SQLAlchemy columns with different DB names use column alias: `mapped_column("createdAt", ...)`
- Router prefix convention: `/api/v1/<resource>` for public; `/api/v1/admin/<resource>` for admin

### Frontend (TypeScript/React Native)

**Files:**
- Expo Router screens: `kebab-case.tsx` under `app/`
- Components: `kebab-case.tsx` under `components/`
- Services: `snake_case.ts` under `services/` (e.g., `restaurants.ts`, `api.ts`)
- Utilities: `snake_case.ts` under `utils/`
- Constants: `snake_case.ts` under `constants/` (e.g., `theme.ts`)

**Symbols:**
- React components: `PascalCase`
- Hooks: `use-kebab-case` filename; `useCamelCase` export
- Service functions: `camelCase` (e.g., `getRestaurants`, `postReview`)

### Admin (TypeScript/Next.js)

**Files:**
- Next.js pages: `page.tsx`, `layout.tsx` per App Router convention
- Components: `kebab-case.tsx`
- Library modules: `kebab-case.ts` under `lib/`
- Route groups: `(auth)`, `(dashboard)` (parentheses = grouping only, not URL segment)

**Symbols:**
- API namespace objects: `camelCase + Api` suffix (e.g., `restaurantsApi`, `aiApi`)
- TypeScript interfaces: `PascalCase` (e.g., `RestaurantListItem`, `Paginated<T>`)
- `cn()` utility for Tailwind class merging: `lib/utils.ts`

---

## Where to Add New Code

### New public REST endpoint (mobile)

1. Add SQLAlchemy model (if new table): `GastroGuide-Backend/app/models/<resource>.py`; import in `GastroGuide-Backend/app/models/__init__.py`
2. Add Pydantic schemas: `GastroGuide-Backend/app/schemas/<resource>.py`
3. Add router file: `GastroGuide-Backend/app/api/<resource>.py` with `APIRouter(prefix="/api/v1/<resource>")`
4. Register router in `GastroGuide-Backend/app/main.py` with `app.include_router(<resource>_router)`
5. Generate migration: `alembic revision --autogenerate -m "<description>"`

### New admin endpoint

1. Follow same model/schema steps above; schemas go in `GastroGuide-Backend/app/schemas/admin/<resource>.py`
2. Add router: `GastroGuide-Backend/app/api/admin/<resource>.py`; use `Depends` from `app/api/admin/deps.py`
3. Register in `app/main.py` with `app.include_router(admin_<resource>_router)`
4. Add endpoint functions to `GastroGuide-Admin/lib/api/endpoints.ts`
5. Add TypeScript types to `GastroGuide-Admin/lib/api/types.ts`

### New frontend screen

1. Create `GastroGuide-FrontEnd/app/<screen-name>.tsx` (top-level modal/detail) or `GastroGuide-FrontEnd/app/(tabs)/<tab-name>.tsx` (tab screen)
2. For tabs: register in `GastroGuide-FrontEnd/app/(tabs)/_layout.tsx`
3. Use `api.get/post` from `GastroGuide-FrontEnd/services/api.ts` for HTTP calls
4. Add service functions to `GastroGuide-FrontEnd/services/<resource>.ts`

### New reusable frontend component

- Place in `GastroGuide-FrontEnd/components/<component-name>.tsx`
- Platform-specific variants: `<component-name>.ios.tsx`

### New admin page

1. Create `GastroGuide-Admin/app/(dashboard)/<section>/page.tsx`
2. Use `requireAdmin()` from `lib/auth/server.ts` in Server Components if auth check needed
3. Call endpoint functions from `GastroGuide-Admin/lib/api/endpoints.ts`

### New admin UI component

- Place in `GastroGuide-Admin/components/<category>/<component-name>.tsx`
- For shadcn/ui primitives: `GastroGuide-Admin/components/ui/<component-name>.tsx`

### ML pipeline extension (no retraining)

- Edit keyword JSON files in `GastroGuide-Backend/app/ml/data/` (plain text edits)
- Adjust scoring weights in `WEIGHTS` dict in `GastroGuide-Backend/app/ml/recommender.py`
- Restart server after any `data/*.json` edit — module-level caches are not hot-reloaded

---

## Special Directories

**`GastroGuide-Backend/app/ml/models/`:**
- Purpose: Stores the trained sklearn `intent_clf.joblib` artefact
- Generated: Yes (via training script, not committed lightly)
- Committed: Yes — must be present for server to start; do not replace without end-to-end intent verification

**`GastroGuide-Backend/app/ml/data/`:**
- Purpose: Editable JSON keyword dictionaries for the rule-based NLP system
- Generated: No — hand-maintained
- Committed: Yes

**`GastroGuide-Backend/alembic/versions/`:**
- Purpose: Database migration history
- Generated: Yes (via `alembic revision --autogenerate`)
- Committed: Yes

**`GastroGuide-Admin/components/ui/`:**
- Purpose: shadcn/ui primitive components
- Generated: Partially (scaffolded by shadcn CLI, then customised)
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: GSD architecture documents consumed by plan-phase and execute-phase
- Generated: Yes (by `gsd:map-codebase`)
- Committed: Recommended

---

*Structure analysis: 2026-05-21*
