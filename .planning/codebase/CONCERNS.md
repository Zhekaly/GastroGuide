# Codebase Concerns

**Analysis Date:** 2026-05-21

---

## Tech Debt

**Deprecated Gemini Integration — Dead Code Still Wired Up:**
- Issue: `app/api/ai.py` and `app/services/ai_service.py` implement the old Gemini-based chat pipeline. Both are still imported and registered in `app/main.py` (`ai_router` on line 35/85). `app/services/ai.py` re-imports the Gemini `model` object from `ai_service.py` for title generation. The active chat pipeline is `POST /api/v1/chat` in `app/api/chat.py`. The old `POST /api/v1/ai/chat` route remains reachable.
- Files: `GastroGuide-Backend/app/api/ai.py`, `GastroGuide-Backend/app/services/ai_service.py`, `GastroGuide-Backend/app/services/ai.py`, `GastroGuide-Backend/app/main.py`
- Impact: (1) `GEMINI_API_KEY` is a required field in `Settings` (`app/core/config.py` line 10) — the server will refuse to start if the key is absent or blank, even though the active ML pipeline never calls Gemini. (2) The dead `/api/v1/ai/chat` route loads every restaurant, menu item, and offer from the database on each call (`db.query(Restaurant).all()` etc.) with no pagination or caching, making it a trivial DoS vector. (3) `google-generativeai` and its 12 transitive dependencies remain in `requirements.txt`.
- Fix approach: Remove `app/api/ai.py`, `app/services/ai_service.py` and the Gemini title generator in `app/services/ai.py`. Make `gemini_api_key` optional (`str | None = None`) in `Settings`. Remove the `ai_router` import and `app.include_router(ai_router)` from `app/main.py`. Remove Google SDK packages from `requirements.txt`.

**`admin_cors_origins` Setting Never Consumed:**
- Issue: `app/core/config.py` defines `admin_cors_origins: str` (line 26) but `app/main.py` hard-codes `allow_origins=["*"]` and never reads this field. The setting exists purely as documentation with no enforcement.
- Files: `GastroGuide-Backend/app/core/config.py`, `GastroGuide-Backend/app/main.py`
- Impact: Configuration drift — operators cannot restrict origins via env var without modifying source code.
- Fix approach: In `app/main.py`, replace the hard-coded `["*"]` with `settings.admin_cors_origins.split(",")` after stripping whitespace.

**Dual Schema-Management (create_all + Alembic):**
- Issue: `app/main.py` `on_startup` calls `Base.metadata.create_all(bind=engine)` (line 72) in addition to the project also using Alembic for migrations. The two mechanisms can diverge: `create_all` silently ignores existing tables and will not apply column changes, while Alembic tracks full migration history.
- Files: `GastroGuide-Backend/app/main.py`, `GastroGuide-Backend/alembic/`
- Impact: After a new migration adds a column, a fresh deployment that runs `create_all` first may reach a different schema state than `alembic upgrade head` would produce. Column-level changes are invisible to `create_all`.
- Fix approach: Remove the `Base.metadata.create_all` call from startup. Rely solely on `alembic upgrade head` as the canonical migration mechanism in deployment scripts.

**Static Restaurant Data File in Frontend:**
- Issue: `GastroGuide-FrontEnd/data/restaurants.ts` contains a hardcoded `RESTAURANTS` array with 6 restaurant entries, full menu items, and a complete `AI_RESPONSES` table. The live app fetches actual data from the API, but this file is imported in at least the legacy AI tab fallback path.
- Files: `GastroGuide-FrontEnd/data/restaurants.ts`
- Impact: Data is stale; hardcoded names and ratings will not reflect database state. `AI_RESPONSES` returns canned answers that bypass the ML pipeline entirely. The "Семейное" category (id 9) is absent from the hardcoded `CATEGORIES` array, causing a category mismatch for any UI that relies on this local list.
- Fix approach: Remove or archive this file. Replace all import sites with live API calls through the services layer.

**Commented-Out Error Handler Block in Frontend API Client:**
- Issue: `GastroGuide-FrontEnd/services/api.ts` lines 66–82 contain a commented-out `if (!response.ok)` block immediately followed by the active version of the same block (lines 84–105). The dead comment block has no meaningful difference and creates confusion about which version is authoritative.
- Files: `GastroGuide-FrontEnd/services/api.ts`
- Impact: Maintainability noise; future developers may be unsure which block to modify.
- Fix approach: Delete the commented-out block (lines 66–82).

---

## Security Considerations

**CORS Wildcard Combined with `allow_credentials=True`:**
- Risk: `app/main.py` sets `allow_origins=["*"]` and `allow_credentials=True` simultaneously (lines 64–65). The WHATWG Fetch spec prohibits `credentials: 'include'` with a wildcard origin — browsers enforce this and FastAPI/Starlette silently accept the config regardless, meaning credentialed cross-origin requests from browsers are actually blocked by the browser, but the policy communicates to developers that credential sharing is intended from any origin.
- Files: `GastroGuide-Backend/app/main.py`
- Current mitigation: Browser enforcement prevents the worst case in browser clients.
- Recommendations: Replace `["*"]` with an explicit allow-list of the admin panel origin and any known mobile deep-link origins. The `admin_cors_origins` field in `Settings` already exists for this purpose but is unused.

**No Rate Limiting on Authentication Endpoints:**
- Risk: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, and `POST /api/v1/admin/auth/login` have no rate limiting, lockout, or CAPTCHA. Password enumeration and brute-force attacks are unconstrained.
- Files: `GastroGuide-Backend/app/api/auth.py`, `GastroGuide-Backend/app/api/admin/auth.py`
- Current mitigation: None.
- Recommendations: Add `slowapi` (FastAPI-compatible rate limiter) to the auth routers. Lock admin login after N failed attempts per IP. Consider a minimum delay response for failed logins.

**JWT Tokens Are Not Revocable:**
- Risk: No token blacklist or server-side session table exists. A stolen or logged-out token remains valid until its `exp` claim elapses. The logout path in the frontend (`storage.clearTokens()`) only removes the token from `AsyncStorage`; the server has no awareness of the logout event.
- Files: `GastroGuide-Backend/app/api/deps.py`, `GastroGuide-Backend/app/core/security.py`, `GastroGuide-FrontEnd/services/storage.ts`
- Current mitigation: Short-lived access tokens (duration set by `ACCESS_TOKEN_EXPIRE_MINUTES`).
- Recommendations: Introduce a token revocation table (or Redis set) keyed on token `jti`; check it in `get_current_user`. Alternatively implement refresh-token rotation with single-use enforcement.

**Admin Panel Middleware Checks Cookie Presence Only:**
- Risk: `GastroGuide-Admin/middleware.ts` redirects to `/login` if the `gg_admin_access` cookie is absent, but does not verify the JWT signature or expiry at the edge. A non-expired cookie with an invalid token would pass the middleware check and fail only when the first API call is made.
- Files: `GastroGuide-Admin/middleware.ts`
- Current mitigation: Backend API calls validate the JWT fully.
- Recommendations: Decode and verify the JWT expiry in middleware using a lightweight JOSE library (e.g., `jose` npm package which is already available in Next.js environments) before allowing access to protected pages.

**Backend `.env` File Present on Disk:**
- Risk: A populated `.env` file exists at `GastroGuide-Backend/.env`. The backend `.gitignore` lists `.env` as ignored, and `git ls-files` confirms it is not tracked. However, the file sits on-disk next to the source tree. If the repository is ever zipped and shared, or if the `.gitignore` rule is accidentally removed, real credentials (DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, R2 keys) could be committed.
- Files: `GastroGuide-Backend/.env` (existence only — contents not read)
- Current mitigation: `.gitignore` entry is present.
- Recommendations: Add a pre-commit hook (e.g., `detect-secrets` or `git-secrets`) to prevent accidental `.env` commits. Store secrets in a vault or CI secrets store for production.

**Weak Minimum Password Requirement:**
- Risk: `UserRegisterRequest` enforces `min_length=6` for passwords (`app/schemas/auth.py` line 12). Six-character passwords are trivially brute-forceable.
- Files: `GastroGuide-Backend/app/schemas/auth.py`
- Current mitigation: Bcrypt hashing (`app/core/security.py`) slows offline attacks.
- Recommendations: Raise minimum to 8 characters; consider complexity requirements (mixed-case, digit, symbol) or a minimum entropy check.

**No File-Type Validation on Image Upload:**
- Risk: `app/api/admin/upload.py` checks file size (8 MB limit) and emptiness, but does not validate `content_type` against an allowlist of safe image MIME types before passing `file.content_type` directly to the R2 upload service. A caller can send a `.js` or `.html` file with a spoofed MIME type.
- Files: `GastroGuide-Backend/app/api/admin/upload.py`
- Current mitigation: Admin-only endpoint (`get_current_admin` dependency).
- Recommendations: Validate `file.content_type` against `{"image/jpeg", "image/png", "image/webp", "image/gif"}` before uploading. Optionally use `python-magic` for byte-level MIME detection independent of the supplied header.

---

## ML Pipeline Concerns

**`intent_clf.joblib` Is a Frozen Binary Artefact:**
- Issue: The only trained model artefact is `GastroGuide-Backend/app/ml/models/intent_clf.joblib` (~1.07 MB, sklearn TfidfVectorizer → LinearSVC → CalibratedClassifierCV). No training script, training corpus, or notebook exists in the repository. There is no reproducible way to retrain or audit the model.
- Files: `GastroGuide-Backend/app/ml/models/intent_clf.joblib`, `GastroGuide-Backend/app/ml/intent_classifier.py`
- Impact: Any new intent requires recreating the training pipeline from scratch. If the model file is lost or corrupted, the entire chat feature stops working (the server raises `FileNotFoundError` on first request). The model was trained on a fixed vocabulary; domain shift (new dish names, slang) degrades accuracy silently.
- Fix approach: Commit the training script and labelled corpus (even a CSV) alongside the joblib. Document sklearn and joblib version pinning requirements. Add a startup health check that verifies the model loads and produces an expected prediction on a canary input.

**`CONFIDENCE_THRESHOLD = 0.35` Is Very Low:**
- Issue: `app/ml/intent_classifier.py` line 9 sets the fallback threshold at 0.35. A calibrated classifier with 10 classes has a random-guess baseline of ~0.10, so 0.35 is only 3.5× above chance. Ambiguous queries that the model is genuinely uncertain about may receive a confident-looking classification rather than a helpful fallback.
- Files: `GastroGuide-Backend/app/ml/intent_classifier.py`
- Impact: Mis-classified intents route the query through wrong scoring paths (e.g., a price query classified as `search_by_mood`) producing confusing restaurant recommendations with no error signal to the user.
- Fix approach: Evaluate precision/recall per intent on a held-out set; raise the threshold to at least 0.50. Log low-confidence classifications for monitoring.

**Module-Level JSON Caches Require Server Restart to Refresh:**
- Issue: `app/ml/recommender.py` (lines 38–42) and `app/ml/response_builder.py` (lines 18–29) maintain process-level `Optional[dict]` caches for `dish_to_menu.json`, `attribute_keywords.json`, and `feature_keywords.json`. `app/ml/entity_extractor.py` loads all keyword JSON files in `__init__` at class construction time. `get_pipeline()` in `app/ml/pipeline.py` (lines 397–402) creates a single `ChatPipeline` instance per process that is never re-created.
- Files: `GastroGuide-Backend/app/ml/recommender.py`, `GastroGuide-Backend/app/ml/response_builder.py`, `GastroGuide-Backend/app/ml/entity_extractor.py`, `GastroGuide-Backend/app/ml/pipeline.py`
- Impact: Edits to any `app/ml/data/*.json` file do not take effect until the uvicorn process is restarted. In a production container deployment this is not obvious, and operators may assume edits are live.
- Fix approach: Document the restart requirement prominently in the CLAUDE.md and in each affected file. For future extensibility, consider a file-watcher based reload or a `POST /api/v1/admin/ml/reload` endpoint that sets the caches to `None` and re-creates the pipeline singleton.

**`mood_tags` Column Is Nullable — Mood Scoring Is a Heuristic Stub:**
- Issue: `Restaurant.mood_tags` is `ARRAY(String), nullable=True, default=None` (`app/models/restaurant.py` lines 81–85). When `mood_tags` is `None` (the current state for all restaurants since the column was added but not yet populated), `_mood_score()` in `app/ml/recommender.py` (lines 94–120) falls back to a heuristic based on `category.label` and `rating`. This heuristic returns non-zero scores for intents that should return 0 if no mood metadata exists.
- Files: `GastroGuide-Backend/app/ml/recommender.py`, `GastroGuide-Backend/app/models/restaurant.py`, `GastroGuide-Backend/alembic/versions/b1c2d3e4f5a6_add_mood_tags_to_restaurants.py`
- Impact: `search_by_mood` queries return results that are ranked by a proxy heuristic, not actual mood curation. Users requesting "romantic" will get high-rating Italian restaurants regardless of whether those venues are actually suitable. Results look plausible but are not curated.
- Fix approach: Populate `mood_tags` via the admin panel for all active restaurants. Once populated, the `if mood_tags:` branch in `_mood_score` activates and displaces the heuristic. Until then, consider returning a user-facing message acknowledging limited mood data rather than silently using the heuristic.

---

## Performance Bottlenecks

**Pipeline Loads All Menu Items on Every Chat Request:**
- Problem: `app/ml/pipeline.py` line 99 issues `db.query(MenuItem).all()` on every single `/api/v1/chat` call. With N restaurants each having M menu items this is an unbounded full-table scan on every message.
- Files: `GastroGuide-Backend/app/ml/pipeline.py`
- Cause: Menu items are needed for dish scoring but are fetched fresh each request rather than being pre-loaded or cached.
- Improvement path: Cache the `menu_items_by_rid` dict in the `ChatPipeline` singleton (invalidated on restaurant/menu write operations), or add a `CACHE_TTL` with background refresh. At minimum, add a DB index on `menu_items.restaurant_id`.

**Dead Gemini Endpoint Scans Full Database Tables:**
- Problem: The deprecated `generate_ai_response()` in `app/services/ai_service.py` (lines 120–122) calls `db.query(Restaurant).all()`, `db.query(MenuItem).all()`, and `db.query(Offer).all()` — three full-table scans — then assembles the entire result set into a prompt string for Gemini. This route remains reachable at `POST /api/v1/ai/chat`.
- Files: `GastroGuide-Backend/app/services/ai_service.py`, `GastroGuide-Backend/app/api/ai.py`
- Cause: Architectural decision of the deprecated pipeline; no pagination was ever applied.
- Improvement path: Remove the endpoint entirely (see Tech Debt section).

---

## Fragile Areas

**Hardcoded Fallback IP in Frontend API Client:**
- Files: `GastroGuide-FrontEnd/services/api.ts` line 36
- Why fragile: When Expo host auto-detection fails (native builds without Expo Go, CI, or TestFlight distribution), the client silently falls back to `http://10.50.75.126:8000/api/v1` — a developer's machine IP that will be unreachable for all other users and in all CI/deployment environments.
- Safe modification: The `EXPO_PUBLIC_API_URL` environment variable (line 39) overrides this correctly. Ensure this variable is always set in all non-development builds. Consider changing the hardcoded fallback to an obviously-broken value (e.g., `http://CONFIGURE_EXPO_PUBLIC_API_URL:8000/api/v1`) so failures are visible rather than silent.
- Test coverage: None. No test validates that the URL resolution logic returns the expected base URL in each branch.

**Cuisine Matching Uses a 7-Character Stem Slice:**
- Files: `GastroGuide-Backend/app/ml/pipeline.py` lines 228–229, `GastroGuide-Backend/app/ml/recommender.py` lines 87–91
- Why fragile: The cuisine filter computes `entities.cuisine.lower()[:7]` and checks if it appears in `category.label.lower()`. The constant `7` is undocumented. For short cuisine names (e.g., "Гриль" = 5 chars) the slice has no effect; for longer names the stem may not be discriminating. Renaming a category in the database could silently break matching without any test surfacing the regression.
- Safe modification: Encapsulate the matching logic in a dedicated function with a constant (named `CUISINE_STEM_LEN`) and add an integration test that verifies each of the 9 category labels matches its expected cuisine keyword.

**`Restaurant.open` (Boolean) vs. Dynamic Hours Logic:**
- Files: `GastroGuide-Backend/app/models/restaurant.py` line 39, `GastroGuide-Backend/app/services/opening_hours_service.py`
- Why fragile: The model has both a static `open: bool` column (legacy) and dynamic `opens_at`/`closes_at`/`is_24_7` columns. Code that calls `is_restaurant_open(restaurant)` uses the dynamic columns; code that falls back to `bool(restaurant.open)` (e.g., `pipeline.py` line 48) uses the static flag. If the static flag is stale, fallback code gives wrong open/closed status. There is no constraint ensuring the two representations are consistent.
- Safe modification: Add a startup or admin diagnostic that flags restaurants where `open` (static) disagrees with the current calculated open status.

---

## Test Coverage Gaps

**No Automated Tests Exist Anywhere:**
- What's not tested: 100% of all three sub-projects. No unit tests, integration tests, or end-to-end tests were found. No `pytest.ini`, `vitest.config`, `jest.config`, or `playwright.config` exists in any sub-project. No test dependencies appear in `requirements.txt` or any `package.json`.
- Files: Entire `GastroGuide-Backend/`, `GastroGuide-FrontEnd/`, `GastroGuide-Admin/`
- Risk: Any refactor, dependency upgrade, or ML keyword change can silently break core features (restaurant recommendation, chat pipeline intent routing, auth token flow, admin CRUD). There is no regression safety net.
- Priority: **High**
- Recommended starting points:
  - Backend: pytest with FastAPI `TestClient`; cover `POST /api/v1/chat` for each of the 10 intents, the auth registration/login/refresh cycle, and `score_restaurants()` unit tests with fixture restaurants.
  - ML: Offline unit tests for `IntentClassifier.predict()` on a golden set of 10–20 labelled Russian queries; tests for `EntityExtractor.extract()` against known outputs.
  - Frontend: Vitest + React Native Testing Library for the services layer (`api.ts` URL resolution, `storage.ts` token lifecycle).

**No Validation That `intent_clf.joblib` Produces Expected Outputs:**
- What's not tested: Model integrity — whether the loaded joblib file produces correct classifications for canonical inputs.
- Files: `GastroGuide-Backend/app/ml/models/intent_clf.joblib`, `GastroGuide-Backend/app/ml/intent_classifier.py`
- Risk: A corrupted or wrong-version model file is only discovered at runtime when a user receives a wrong recommendation.
- Priority: **High**
- Fix: Add a canary assertion in `get_classifier()` or a startup health-check endpoint that runs 3–5 known-correct predictions and raises an alert if any differ from expected labels.

---

## Dependencies at Risk

**`python-jose` — Maintenance Status:**
- Risk: `python-jose==3.5.0` (in `requirements.txt`) has had minimal maintenance activity. A known CVE (CVE-2024-33663) affects RSA key confusion in some versions. The project uses HS256 only, which is not affected by the RSA issue, but the package's low maintenance velocity is a long-term concern.
- Impact: JWT decoding in `app/api/deps.py`, `app/api/admin/deps.py`, `app/api/auth.py`, `app/core/security.py`.
- Migration plan: Evaluate `PyJWT` (actively maintained, simpler API) as a drop-in replacement for the HS256 use case.

**`passlib==1.7.4` — No New Releases Since 2020:**
- Risk: `passlib` is effectively unmaintained. It still functions correctly for bcrypt hashing but will not receive security patches.
- Impact: Password hashing in `app/core/security.py`.
- Migration plan: Replace with direct `bcrypt` package calls (`import bcrypt; bcrypt.hashpw(...)`) or `argon2-cffi` for stronger hashing.

---

*Concerns audit: 2026-05-21*
