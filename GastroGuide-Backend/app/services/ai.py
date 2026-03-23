from app.services.ai_service import model


def generate_chat_title_from_ai(message: str) -> str:
    prompt = f"""
Сгенерируй КОРОТКИЙ заголовок (2-4 слова) для пользовательского запроса.

Запрос: "{message}"

Требования:
- максимум 4 слова
- без кавычек
- без точки
- только сам заголовок

Пример:
"Где поесть суши рядом" → "Суши рядом"
"Хочу кофе и десерт" → "Кофе и десерт"

Ответ:
"""

    try:
        response = model.generate_content(prompt)
        title = response.text.strip()

        # защита от мусора
        if len(title) > 50:
            title = title[:50]

        return title

    except Exception:
        return message[:40]  # fallback