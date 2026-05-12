# Bootstrap-скрипт для создания первого администратора.
#
# Использование:
#   .venv/bin/python -m app.scripts.create_admin --email admin@example.com --password "secret123" --name "Admin"
#
# Если пользователь с таким email уже существует — ему будет назначена роль admin.

import argparse
import sys

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import USER_ROLE_ADMIN, User


def main():
    parser = argparse.ArgumentParser(description="Create or promote admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Administrator")
    parser.add_argument("--city", default="Астана")
    args = parser.parse_args()

    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == args.email).first()

        if existing:
            existing.role = USER_ROLE_ADMIN
            existing.is_active = True
            if args.password:
                existing.password_hash = get_password_hash(args.password)
            db.add(existing)
            db.commit()
            print(f"✔ Existing user '{existing.email}' upgraded to admin.")
            return 0

        admin = User(
            name=args.name,
            email=args.email,
            password_hash=get_password_hash(args.password),
            city=args.city,
            role=USER_ROLE_ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"✔ Admin user created: id={admin.id}, email={admin.email}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
