# Testing Patterns

**Analysis Date:** 2026-05-21

---

## Summary

**There is effectively zero automated test coverage across all three sub-projects.** No test files (`*.test.*`, `*.spec.*`, `test_*.py`, `*_test.py`) were found anywhere in the repository. No test runner configuration files exist (`jest.config.*`, `vitest.config.*`, `pytest.ini`, `pyproject.toml`, `setup.cfg`). The only testing-related artefact is a single manual mock file in the frontend.

This section documents what exists and what is entirely missing.

---

## What Exists

### Frontend — `__mocks__/react-native-maps.js`

**File:** `GastroGuide-FrontEnd/__mocks__/react-native-maps.js`

This is a Jest/manual-mock stub for `react-native-maps` intended for use on web/test environments where the native map component is unavailable:

```javascript
// Stub for react-native-maps on web
import React from 'react';
import { View, Text } from 'react-native';

export const MapView = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text>Map not available on web</Text>
  </View>
);

export const Marker = () => null;
export const PROVIDER_GOOGLE = 'google';
export default MapView;
```

This mock exists in the `__mocks__/` directory at the project root (alongside `node_modules`), which is the standard Jest manual-mock location for third-party modules. However, since no Jest configuration and no test files exist, this mock is currently inert — it was written in anticipation of a test suite that was never built.

---

## What Does NOT Exist

### GastroGuide-Backend (Python / FastAPI)

| Item | Status |
|---|---|
| Test framework (pytest) | Not installed — not in `requirements.txt` |
| Test directory (`tests/`) | Not present |
| Test files (`test_*.py`) | None found |
| Fixtures / factories | None |
| API integration tests | None |
| ML pipeline unit tests | None |
| Schema validation tests | None |

No `pytest`, `httpx[test]`, or `factory-boy` packages appear in `GastroGuide-Backend/requirements.txt`. The backend has no automated coverage of any kind.

### GastroGuide-FrontEnd (React Native / Expo)

| Item | Status |
|---|---|
| Test framework (Jest / Vitest) | Not configured — no `jest.config.*`, no `vitest.config.*` |
| Jest in `package.json` | Not present in `devDependencies` |
| Test files (`*.test.tsx`) | None found |
| Component tests | None |
| Service layer tests | None |
| `__mocks__/react-native-maps.js` | Present (orphaned stub, no test suite to use it) |

The `package.json` scripts are: `start`, `reset-project`, `android`, `ios`, `web`, `lint`. There is no `test` script.

### GastroGuide-Admin (Next.js)

| Item | Status |
|---|---|
| Test framework | Not configured |
| Jest / Vitest in `package.json` | Not present in `devDependencies` |
| Test files (`*.test.tsx`) | None found |
| Component tests | None |
| API client tests | None |

The `package.json` scripts are: `dev`, `build`, `start`, `lint`, `typecheck`. There is no `test` script.

---

## What TypeScript Checking Provides (Partial Safety Net)

Both TypeScript projects have `"strict": true` enforced. The admin panel has a `typecheck` script (`tsc --noEmit`). This catches type errors at build time but does not replace runtime behaviour testing.

```bash
# Admin — type checking only
cd GastroGuide-Admin && npm run typecheck

# Frontend — linting only
cd GastroGuide-FrontEnd && npm run lint
```

---

## Risk Assessment

**High risk areas with no test coverage:**

1. **ML pipeline** (`GastroGuide-Backend/app/ml/`) — The intent classifier, entity extractor, recommender scoring weights, and response builder all have zero tests. The rule-based keyword dictionaries (`app/ml/data/*.json`) are modified directly without any regression safety net.

2. **JWT auth logic** (`GastroGuide-Backend/app/core/security.py`, `app/api/deps.py`) — Token generation, validation, and the `get_current_user` / `get_optional_user` split are untested.

3. **Recommender scoring** (`GastroGuide-Backend/app/ml/recommender.py`) — Weight constants in `WEIGHTS` dict and per-intent overrides in `pipeline.py` have no unit tests. Changing a weight silently affects all recommendations.

4. **Services layer** (`GastroGuide-FrontEnd/services/`) — API calls, token injection logic, and error handling in `services/api.ts` are untested. The 401-token-clear path and the host auto-detection logic are entirely manual-test only.

5. **Admin API client** (`GastroGuide-Admin/lib/api/client.ts`) — The server-vs-client cookie reading branch (`resolveAccessToken`) and `ApiError` class are untested.

---

## Recommended Starting Point (if tests are added)

### Backend

```bash
pip install pytest pytest-asyncio httpx
```

Suggested first tests:
- `tests/ml/test_intent_classifier.py` — assert each of the 10 intent labels with representative Russian phrases
- `tests/ml/test_entity_extractor.py` — assert cuisine/price/mood/feature extraction against known inputs
- `tests/api/test_restaurants.py` — use `TestClient` from FastAPI to verify `/api/v1/restaurants` filtering

### Frontend

```bash
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest
```

Jest config for Expo: use `jest-expo` preset, which picks up the existing `__mocks__/react-native-maps.js` automatically.

Suggested first tests:
- `services/__tests__/api.test.ts` — mock `fetch`, assert auth header injection and 401 token-clear behaviour
- `utils/__tests__/format.test.ts` — pure functions `parseDistanceToMeters`, `formatDistanceFromMeters` are ideal unit test targets

### Admin

```bash
npm install --save-dev vitest @testing-library/react jsdom
```

Suggested first tests:
- `lib/api/__tests__/client.test.ts` — assert `ApiError` construction and `buildQueryString` edge cases

---

*Testing analysis: 2026-05-21*
