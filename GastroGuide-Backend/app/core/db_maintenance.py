# Утилиты обслуживания БД.
# Главное — синхронизация PostgreSQL sequences после ручного импорта данных
# (когда id указывались явно, а sequence остался на 1).

from sqlalchemy import text
from sqlalchemy.engine import Engine


# Таблицы с auto-increment колонкой `id`. activity_logs тоже включаем.
TABLES_WITH_ID_SEQUENCE: tuple[str, ...] = (
    "restaurants",
    "menu_items",
    "offers",
    "categories",
    "reviews",
    "users",
    "favorites",
    "activity_logs",
)


def sync_id_sequences(engine: Engine) -> dict[str, int]:
    """
    Сбрасывает sequence для каждой таблицы из списка к COALESCE(MAX(id), 1).

    Это устраняет ошибку:
        duplicate key value violates unique constraint "<table>_pkey"
    которая возникает после ручной загрузки данных с явным id.

    Возвращает словарь {table: new_sequence_value}.
    """
    results: dict[str, int] = {}

    with engine.begin() as conn:
        for table in TABLES_WITH_ID_SEQUENCE:
            try:
                value = conn.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table}), 1), true)"
                    )
                ).scalar()
                results[table] = int(value or 0)
            except Exception as exc:
                # Не валим старт сервера, если какой-то таблицы не существует
                results[table] = -1
                print(f"[db_maintenance] skip {table}: {exc}")

    return results
