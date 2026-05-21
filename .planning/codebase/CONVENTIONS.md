# Coding Conventions

**Analysis Date:** 2026-05-21

---

## 1. Language-Level Overview

| Sub-project | Language | Style tooling |
|---|---|---|
| `GastroGuide-Backend/` | Python 3.11+ | No enforced formatter/linter detected (no `.flake8`, `ruff.toml`, or `pyproject.toml` present) |
| `GastroGuide-FrontEnd/` | TypeScript 5.9, React Native | ESLint via `eslint-config-expo` (`eslint.config.js`) |
| `GastroGuide-Admin/` | TypeScript 5.6, Next.js 15 | ESLint via `eslint-config-next` (`package.json` `lint` script) |

Both TypeScript projects have `"strict": true` in their respective `tsconfig.json` files.

---

## 2. Python (Backend) Conventions

### 2.1 File-header comments
Every Python source file begins with a short Russian-language comment block explaining the module's purpose. This is consistently applied across `app/api/`, `app/models/`, `app/schemas/`, and `app/core/`. Example from `app/models/restaurant.py`:

```python
# SQLAlchemy-модель заведения.
# Описывает таблицу restaurants, её поля,
# а также связи с меню, категориями, отзывами и избранным.
```

### 2.2 SQLAlchemy 2.0 `Mapped[]` typing
All ORM models use the SQLAlchemy 2.0 `Mapped[T]` / `mapped_column()` API. Standard imports in every model:

```python
from sqlalchemy.orm import Mapped, mapped_column, relationship
```

Column declarations:
- Scalar columns: `id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)`
- Nullable columns: `category_id: Mapped[int | None] = mapped_column(..., nullable=True)`
- PostgreSQL arrays: `features: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)`
- Timestamps: always `DateTime(timezone=True)`, default via `lambda: datetime.now(timezone.utc)` — never bare `datetime.utcnow()`

Column-name aliasing (snake_case Python → camelCase DB) done via the positional string in `mapped_column`:
```python
price_range: Mapped[int] = mapped_column("priceRange", Integer, nullable=False)
```

Key model files: `app/models/restaurant.py`, `app/models/user.py`, `app/models/review.py`, `app/models/offer.py`, `app/models/menu_item.py`, `app/models/favorite.py`, `app/models/category.py`.

### 2.3 Pydantic v2 schemas
Schemas use Pydantic v2 idioms throughout:

```python
from pydantic import BaseModel, ConfigDict, Field

class RestaurantResponse(BaseModel):
    priceRange: int = Field(validation_alias="price_range")
    createdAt: datetime = Field(validation_alias="created_at")

    model_config = ConfigDict(from_attributes=True)
```

- ORM → schema conversion via `from_attributes=True` (replaces v1 `orm_mode = True`).
- `Field(validation_alias=...)` bridges snake_case ORM attributes to camelCase JSON field names.
- One older schema (`app/schemas/auth.py` `UserResponse`) still uses the v1 `class Config: from_attributes = True` inner-class pattern — this is legacy and should be migrated to `model_config = ConfigDict(from_attributes=True)`.
- Input validation constraints declared inline: `Field(..., min_length=2, max_length=100)`.

Schema files: `app/schemas/restaurant.py`, `app/schemas/auth.py`, `app/schemas/review.py`, `app/schemas/offer.py`, `app/schemas/ai.py`, `app/schemas/profile.py`.

### 2.4 FastAPI router pattern
Each API module creates its own `APIRouter` with a hardcoded prefix and tag:

```python
router = APIRouter(prefix="/api/v1/restaurants", tags=["Restaurants"])
```

All routers are imported and registered in `app/main.py`. Public (mobile) routers are included at top-level; admin routers live in `app/api/admin/` and are included separately.

### 2.5 Dependency injection
Two reusable auth dependencies in `app/api/deps.py`:
- `get_current_user` — raises 401 if no valid token.
- `get_optional_user` — returns `None` for unauthenticated requests (used on the `/chat` endpoint).
- DB sessions injected via `Depends(get_db)` from `app/core/database.py`.

### 2.6 ML code — `@dataclass` pattern
`app/ml/entity_extractor.py` uses `@dataclass` + `field(default_factory=...)` for the `Entities` value object:

```python
from dataclasses import dataclass, field

@dataclass
class Entities:
    cuisine: Optional[str] = None
    dish_keywords: list[str] = field(default_factory=list)
    price_limit: Optional[int] = None
    nearby: bool = False
```

This is the only dataclass in the codebase; all other domain objects use SQLAlchemy models or Pydantic schemas.

### 2.7 Module-level singletons (ML)
`app/ml/intent_classifier.py` and `app/ml/recommender.py` use a lazy global + getter pattern:

```python
_classifier = None

def get_classifier():
    global _classifier
    if _classifier is None:
        _classifier = joblib.load(MODEL_PATH)
    return _classifier
```

`app/ml/pipeline.py` holds `_pipeline_instance` and exposes a `get_pipeline()` function. These singletons are loaded once per process and are never thread-safe — acceptable because uvicorn runs synchronous DB queries in a single-threaded synchronous context for this project.

### 2.8 Logging
Two logger patterns are in use:

| Pattern | Location |
|---|---|
| `logger = logging.getLogger(__name__)` | `app/ml/intent_classifier.py`, `app/ml/entity_extractor.py`, `app/ml/recommender.py` |
| `logger = logging.getLogger("gastroguide.ml")` | `app/ml/pipeline.py` (named logger, level forced to INFO in `app/main.py`) |

Root logging is configured in `app/main.py` via `logging.basicConfig`. Do not use `print()` in new code; use `logger.info/warning/error`.

### 2.9 Russian-language strings
All user-facing strings and ML keyword dictionaries are in Russian by deliberate design. This includes:
- `app/ml/data/*.json` — cuisine keywords, dish keywords, mood keywords, price markers, etc.
- AI chat responses and session titles in `app/ml/response_builder.py`
- Default field values in schemas: `city: str = Field(default="Астана", ...)`
- Rating display uses the `★` symbol; distances use `м` / `км`.

### 2.10 Naming conventions
- **Modules/files**: `snake_case.py`
- **Classes**: `PascalCase` (e.g. `Restaurant`, `EntityExtractor`, `ChatPipeline`)
- **Functions/methods**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE` (e.g. `CONFIDENCE_THRESHOLD`, `WEIGHTS`, `USER_ROLE_ADMIN`)
- **Private/internal functions**: leading underscore `_load_json`, `_get_dish_to_menu`
- **FastAPI route handler functions**: descriptive `snake_case` verbs, e.g. `get_restaurants`, `search_restaurants`

---

## 3. TypeScript / React Conventions (Frontend + Admin)

### 3.1 Components — functional only
All components across both TypeScript sub-projects are function components. No class components exist. Default exports are used for page/screen components; named exports for reusable components.

Examples:
- `export default function HomeScreen()` — `GastroGuide-FrontEnd/app/(tabs)/index.tsx`
- `export function RestaurantForm(...)` — `GastroGuide-Admin/components/forms/restaurant-form.tsx`

### 3.2 Local `const C = {...}` color-token pattern (Frontend)
Every screen file in `GastroGuide-FrontEnd/app/(tabs)/` defines a local color-token object at module level. The object is always named `C` and always includes at minimum `bg`, `dark`, `accent`, `muted`, `border`:

```typescript
const C = {
  bg: '#FDF8F2', dark: '#1A1208', accent: '#E8420A',
  muted: '#8C7B6B', border: '#EDE5D8', green: '#2E7D32',
};
```

This pattern appears identically in:
- `app/(tabs)/index.tsx`
- `app/(tabs)/ai.tsx` (extended with `drawerBg`, `drawerCard`, etc.)
- `app/(tabs)/map.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/search.tsx`

`constants/theme.ts` exports `Colors` (light/dark theme) and `Fonts` (platform-specific font stacks), but screen files do not import from it — they use the local `C` object. When changing colors, update both `constants/theme.ts` and every local `C` declaration.

### 3.3 StyleSheet pattern (Frontend)
All styles are declared via `StyleSheet.create({...})` at the bottom of each file. Style objects are named with short camelCase abbreviations tied to the component they style. Multiple style sheets per file when there are multiple inline components:

```typescript
// main screen styles
const s = StyleSheet.create({ container: {...}, ... });

// RestaurantCardItem styles (inline component in ai.tsx)
const rc = StyleSheet.create({ card: {...}, tagBadge: {...}, ... });

// chat-history drawer styles
const ch = StyleSheet.create({ msgText: {...}, ... });
```

### 3.4 Inline sub-components (Frontend)
Small, screen-specific components are defined inline in the same file as the screen that uses them, not extracted to separate files. Notable examples:
- `function BoldText(...)` — defined in `app/(tabs)/ai.tsx`, renders `**bold**` markdown inline
- `function RestaurantCardItem(...)` — defined in `app/(tabs)/ai.tsx`, renders horizontal scroll cards below AI messages; not a separate file

Extract to `components/` only when a component is reused across more than one screen.

### 3.5 Type definitions (Frontend)
Types used within a single screen are declared inline at the top of the file, below the `C` color block:

```typescript
type Msg = {
  id: number;
  role: 'ai' | 'user';
  text: string;
  time: string;
  cards?: RestaurantCardType[];
};
```

Cross-screen types (API response shapes) live in `services/*.ts` as exported `type` declarations alongside the service functions that return them.

### 3.6 Services layer pattern (Frontend)
All API calls are proxied through `services/api.ts`. Service files (`services/restaurants.ts`, `services/auth.ts`, etc.) call `apiGet` / `api.post` etc., never `fetch` directly. Auth token injection is done per-call via `auth: true` — there is no global interceptor.

Service functions return plain `Promise<T>` values; screens call them inside `useCallback` or `useEffect` and manage their own `loading` / `error` state.

### 3.7 Admin panel patterns
`GastroGuide-Admin/` follows Next.js App Router conventions:
- All interactive components use `"use client"` directive.
- Data fetching uses `@tanstack/react-query` (`useQuery` / `useMutation`).
- Forms use React state (`useState`) directly — not `react-hook-form` (despite it being in `package.json`).
- UI primitives from Radix UI, wrapped as shadcn/ui components in `components/ui/`.
- Tailwind CSS for styling (no `StyleSheet`, no `C` color objects).
- API client: `apiFetch<T>` in `lib/api/client.ts` — a single universal function that reads auth tokens from cookies (server-side via `next/headers`, client-side via `document.cookie`).
- Errors are surfaced via `sonner` toast notifications (`toast.success(...)` / `toast.error(...)`).
- Russian strings appear in UI labels and toast messages: `"Видимость изменена"`, `"Ресторан"`, default form value `tag: "Ресторан"`.

### 3.8 Import organization (TypeScript)
Observed import order (no enforced grouping rule detected, but consistently applied):
1. React and React-Native / Next.js core
2. Third-party packages (`expo-router`, `@tanstack/react-query`, icon sets)
3. Internal services / lib imports (`@/lib/api/...`, `../../services/...`)
4. Component imports
5. Type-only imports (`import type { ... }`)

Path alias `@/*` maps to the project root in both TypeScript projects.

### 3.9 Naming conventions (TypeScript)
- **Files**: `kebab-case.tsx` for components (e.g. `restaurant-form.tsx`, `data-table.tsx`); `camelCase.ts` for utilities and services (e.g. `restaurantImages.ts`, `format.ts`)
- **Components**: `PascalCase` function name matching the filename
- **Hooks**: `use-` prefix with camelCase (`use-color-scheme.ts`, `use-theme-color.ts`)
- **Constants / lookup maps**: `UPPER_SNAKE_CASE` (e.g. `CATEGORY_ICONS`, `FILTERS`, `QUICK`, `STORAGE_KEY`)
- **Local type aliases**: short `PascalCase` (e.g. `Msg`, `Session`)

### 3.10 Error handling patterns

**Frontend screens:**
- `try/catch` inside `useCallback`/`useEffect`, setting local `error: string | null` state.
- Auth errors detected by string-matching the error message; `isAuthError` helper in `app/(tabs)/profile.tsx`:
  ```typescript
  function isAuthError(err: unknown) {
    return err instanceof Error &&
      (err.message.includes('Could not validate credentials') || err.message.includes('401'));
  }
  ```
- `api.ts` automatically calls `storage.clearTokens()` on 401.
- Error messages surfaced to users are in Russian: `'Не удалось загрузить данные'`.

**Admin panel:**
- `useMutation` `onError` callbacks surface errors via `toast.error(...)`.
- `ApiError` custom class in `lib/api/client.ts` carries `status`, `message`, and `payload`.

**Backend:**
- HTTPException raised with `status_code` and `detail` on auth failures; errors propagate to FastAPI's default JSON error responses.
- ML errors caught at the service boundary and logged; fallback paths always return a valid response rather than throwing.

### 3.11 Commented-out code
A substantial amount of commented-out code exists in the frontend, representing prior iterations of functions. Examples in `services/restaurants.ts` (old `getRestaurantById` signature), `app/(tabs)/index.tsx` (original `loadData` implementation), and `app/(tabs)/map.tsx` (old `Image` import). This is normal for an actively developed project but should be cleaned up before v1 release.

---

## 4. Russian-Language Convention (All Projects)

All user-facing text is in Russian by deliberate design:
- API error messages: `"Could not validate credentials"` (backend, English) vs. screen-level error messages in Russian
- Default city value: `"Астана"`
- ML chat strings: `"Привет! Я **AI Гастрогид**..."`, quick-prompt labels `"Что рядом?"`, `"До 2000 ₸"` etc.
- Admin toast messages: `"Видимость изменена"`, `"Ошибка"`, default form field `tag: "Ресторан"`
- Category labels used as exact DB keys: `Казахская`, `Японская`, `Итальянская`, `Гриль`, `Вегетарианская`, `Кофейня`, `Азиатская`, `ЗОЖ`, `Семейное`

When adding new user-visible strings, use Russian in all three sub-projects.

---

*Convention analysis: 2026-05-21*
