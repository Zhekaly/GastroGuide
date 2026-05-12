# GastroGuide Admin

Web-панель администратора для GastroGuide. Отдельный проект на Next.js 15 (App Router),
TypeScript, TailwindCSS, shadcn/ui, TanStack Table, React Query.

Админ-панель общается **только** через REST API существующего FastAPI-бэкенда
(`/api/v1/admin/*`) и **никогда** напрямую с PostgreSQL.

## Установка

```bash
cd GastroGuide-Admin
npm install
cp .env.local.example .env.local
# при необходимости поменяй NEXT_PUBLIC_API_URL
npm run dev
```

Открой http://localhost:3001.

## Первый вход

В админку могут входить только пользователи с ролью `admin`. Создай первого админа на бекенде:

```bash
cd GastroGuide-Backend
source .venv/bin/activate
python -m alembic upgrade head    # применит миграцию с role/is_active
python -m app.scripts.create_admin \
  --email admin@gastroguide.local \
  --password "SuperSecret123" \
  --name "Сanat"
```

## Структура

- `app/(auth)/login` — экран входа.
- `app/(dashboard)/dashboard` — главная статистика.
- `app/(dashboard)/restaurants` — CRUD заведений.
- `app/(dashboard)/menu` — меню.
- `app/(dashboard)/offers` — акции.
- `app/(dashboard)/reviews` — модерация отзывов.
- `app/(dashboard)/users` — пользователи.
- `app/(dashboard)/categories` — категории.
- `app/(dashboard)/ai` — AI-аналитика и сессии.
- `app/(dashboard)/system` — система: битые рестораны, лог действий.
- `lib/api/` — типизированный HTTP-клиент и эндпоинты.
- `lib/auth/` — серверный helper для проверки токена и редиректов.
- `components/ui/` — shadcn-компоненты.
- `components/layout/` — Sidebar, Navbar.
- `components/forms/` — формы.
- `components/maps/` — Leaflet map picker.
