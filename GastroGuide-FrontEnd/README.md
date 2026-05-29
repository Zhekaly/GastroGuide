# GastroGuide Frontend

Mobile frontend for **GastroGuide** — a restaurant discovery and recommendation application for Astana.

The frontend is built with React Native, Expo, Expo Router, and TypeScript. It communicates with the FastAPI backend through REST API endpoints under `/api/v1`.

---

## Main Features

- Onboarding screen
- User registration and login
- Guest browsing mode
- Home feed with restaurants
- Restaurant detail screen
- Restaurant menu display
- Search and filtering
- Category filtering
- Nearby restaurant discovery
- Interactive map with restaurant markers
- Route building to selected restaurants
- Favorites
- Reviews
- Profile screen
- Profile editing
- AI assistant chat
- AI recommendation cards
- AI chat sessions and history for authenticated users

---

## Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript
- React Navigation
- React Native Maps
- Expo Location
- AsyncStorage
- Expo Haptics
- Expo Vector Icons

---

## Project Structure

```text
GastroGuide-FrontEnd/
│
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tab navigation
│   │   ├── index.tsx            # Home screen
│   │   ├── search.tsx           # Search and filters
│   │   ├── map.tsx              # Map screen
│   │   ├── ai.tsx               # AI assistant screen
│   │   └── profile.tsx          # User profile screen
│   │
│   ├── _layout.tsx              # Root app layout
│   ├── index.tsx                # Initial route / redirect logic
│   ├── onboarding.tsx           # Login, registration, and guest entry
│   ├── detail.tsx               # Restaurant detail screen
│   └── edit-profile.tsx         # Profile editing screen
│
├── assets/                      # Application icons and static images
├── components/                  # Reusable UI components
├── constants/                   # Theme and constants
├── data/                        # Local fallback/mock data if needed
├── hooks/                       # Custom hooks
├── services/                    # API clients and domain services
│   ├── api.ts                   # Base API wrapper
│   ├── auth.ts                  # Authentication service
│   ├── restaurants.ts           # Restaurant API service
│   ├── favorites.ts             # Favorites service
│   ├── offers.ts                # Offers service
│   ├── profile.ts               # Profile service
│   ├── reviews.ts               # Reviews service
│   ├── routes.ts                # Route building service
│   ├── ai.ts                    # AI assistant service
│   └── storage.ts               # Token/session storage
│
├── utils/                       # Formatting and helper functions
├── app.json                     # Expo configuration
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Requirements

- Node.js
- npm
- Expo CLI / Expo tools through `npx`
- Expo Go on a physical phone, or Android/iOS emulator
- Running GastroGuide backend

---

## Installation

```bash
cd GastroGuide-FrontEnd
npm install
```

---

## Running the App

```bash
npx expo start
```

The Expo terminal will provide options for running the app:

- Expo Go on a physical phone
- Android emulator
- iOS simulator
- Web mode

The project also includes package scripts:

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
```

---

## Backend Connection

The frontend uses `services/api.ts` as the central API wrapper.

By default:

- Web mode uses `http://127.0.0.1:8000/api/v1`
- Native Expo development tries to detect the local Expo host and use it as the backend host

If automatic detection is not suitable, create an environment variable:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

For testing on a physical phone, use the local IP address of the computer running the backend:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.78:8000/api/v1
```

The backend should be started with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Both the phone and the computer must be connected to the same network.

---

## Main Screens

### Home

Displays restaurant cards and main discovery content.

### Search

Allows users to search restaurants and filter them by category or query.

### Map

Displays restaurants on the map and supports location-based interaction.

### AI Assistant

Sends natural-language messages to the backend ML assistant and displays:

- assistant response text
- recommended restaurant cards
- chat sessions
- chat history

### Profile

Displays user information, profile statistics, favorites, and user-related actions.

### Restaurant Detail

Shows restaurant information, menu items, photos, offers, address, phone, working hours, rating, reviews, and route-related actions.

---

## Authentication Flow

The application supports:

- registration
- login
- logout
- guest mode
- token storage with AsyncStorage
- authenticated API requests with Bearer token

Access and refresh tokens are stored through `services/storage.ts`.

---

## API Services

The main service files are:

- `services/auth.ts` — registration, login, logout, authentication state
- `services/restaurants.ts` — restaurants, menu, search, nearby, categories
- `services/favorites.ts` — favorite restaurants
- `services/offers.ts` — offers
- `services/profile.ts` — profile and profile statistics
- `services/reviews.ts` — reviews
- `services/routes.ts` — route building
- `services/ai.ts` — AI assistant and AI chat history
- `services/storage.ts` — access token, refresh token, and session storage

---

## Useful Development Notes

### Running with local backend on the same computer

Use:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

### Running with backend from a physical phone

Use the computer's local IPv4 address:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000/api/v1
```

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.78:8000/api/v1
```

### Finding local IP on Windows

```bash
ipconfig
```

Use the `IPv4 Address` value of the active Wi-Fi adapter.

---

## Linting

```bash
npm run lint
```

---

## Notes

The frontend should be used together with the backend from `GastroGuide-Backend`. Some screens require the backend database to contain restaurant, menu, category, offer, and user data.
