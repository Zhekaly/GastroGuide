# GastroGuide Admin

A web-based administration panel for **GastroGuide**.

The admin panel is a separate web application built with Next.js 15. It is used to manage system data, including restaurants, menus, offers, reviews, users, categories, AI analytics, and internal service data.

The admin panel communicates **only** through the existing FastAPI backend REST API (`/api/v1/admin/*`) and **never** connects directly to PostgreSQL.

---

## Technologies

- Next.js 15
- App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Table
- React Query
- Axios
- React Hook Form
- Zod
- Leaflet / React Leaflet
- Sonner

---

## Implemented Features

- administrator login
- access / refresh token storage in cookies
- statistics dashboard
- restaurant management
- restaurant card creation and editing
- restaurant menu management
- offer management
- review moderation
- user management
- category management
- AI analytics and AI session viewing
- system section
- viewing invalid or incomplete restaurant data
- action log
- image upload through the backend and Cloudflare R2
- map-based coordinate picker for restaurants
- role guard for protected pages

---

## Installation

```bash
cd GastroGuide-Admin
npm install
cp .env.local.example .env.local
```

In `.env.local`, specify the backend URL:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Running the Project

Before starting the admin panel, the backend must be running.

```bash
npm run dev
```

The admin panel will be available at:

```text
http://localhost:3001
```

---

## First Login

Only users with the `admin` role can log in to the admin panel.

Create the first administrator on the backend:

```bash
cd GastroGuide-Backend
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux
alembic upgrade head
python -m app.scripts.create_admin \
  --email admin@gastroguide.local \
  --password "SuperSecret123" \
  --name "Admin"
```

After that, you can log in to the admin panel using the specified email and password.

---

## Project Structure

```text
GastroGuide-Admin/
│
├── app/
│   ├── (auth)/
│   │   └── login/               # Login page
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/           # Main dashboard and moderator dashboard
│   │   ├── restaurants/         # Restaurant list, create, edit
│   │   ├── menu/                # Menu management
│   │   ├── offers/              # Offer management
│   │   ├── reviews/             # Review moderation
│   │   ├── users/               # User management
│   │   ├── categories/          # Category management
│   │   ├── ai/                  # AI analytics and sessions
│   │   └── system/              # System tools, invalid data, activity logs
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── forms/                   # Entity forms and upload components
│   ├── layout/                  # Sidebar, navbar, role guard, global search
│   ├── maps/                    # Leaflet map picker
│   ├── tables/                  # Data table components
│   └── ui/                      # shadcn/ui components
│
├── lib/
│   ├── api/                     # Typed API client and endpoints
│   ├── auth/                    # Cookie and server auth helpers
│   ├── hooks/                   # Custom hooks
│   ├── providers.tsx            # React Query and app providers
│   └── utils.ts
│
├── middleware.ts                # Route protection middleware
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── .env.local.example
├── .gitignore
└── README.md
```

---

## Main Pages

- `app/(auth)/login` — login screen
- `app/(dashboard)/dashboard` — main statistics dashboard
- `app/(dashboard)/restaurants` — restaurant CRUD
- `app/(dashboard)/restaurants/new` — new restaurant creation
- `app/(dashboard)/restaurants/[id]` — restaurant editing
- `app/(dashboard)/menu` — menu management
- `app/(dashboard)/offers` — offers
- `app/(dashboard)/reviews` — review moderation
- `app/(dashboard)/users` — users
- `app/(dashboard)/categories` — categories
- `app/(dashboard)/ai` — AI analytics and sessions
- `app/(dashboard)/system` — system section: invalid data and action log

---

## Backend Integration

The admin panel uses the base backend URL from the following environment variable:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

It then forms the admin API base URL:

```text
http://127.0.0.1:8000/api/v1/admin
```

Main integration files:

- `lib/api/config.ts` — API URL and cookie names
- `lib/api/client.ts` — HTTP client
- `lib/api/endpoints.ts` — endpoint helpers
- `lib/api/types.ts` — TypeScript API types
- `lib/auth/server.ts` — server-side authentication helper
- `lib/auth/cookies.ts` — cookie management
- `middleware.ts` — admin route protection

---

## Access and Roles

The admin panel is intended for users with the following roles:

- `admin`
- `moderator`

Regular mobile application users should not have access to the admin panel.

---

## Scripts

```bash
npm run dev        # development server on port 3001
npm run build      # production build
npm run start      # start production server on port 3001
npm run lint       # linting
npm run typecheck  # TypeScript check
```

---

## Important Conditions for Correct Operation

1. The backend must be running.
2. Alembic migrations must be applied in the backend.
3. A user with the `admin` role must exist.
4. `NEXT_PUBLIC_API_URL` must point to the FastAPI backend address.
5. For image uploads, the backend must have correctly configured Cloudflare R2 environment variables.
