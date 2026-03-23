# Сервисный слой AI-ассистента GastroGuide.
# Здесь находится логика подготовки контекста по ресторанам,
# истории диалога, избранному и nearby-заведениям для генерации ответа AI.

import google.generativeai as genai
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.restaurant import Restaurant
from app.models.menu_item import MenuItem
from app.models.offer import Offer
from app.services.location_service import haversine_distance


genai.configure(api_key=settings.gemini_api_key)

model = genai.GenerativeModel("gemini-2.5-flash")


# Формирование контекста по заведениям, меню и акциям
def build_restaurants_context(restaurants, menu_items, offers):
    text = ""

    for r in restaurants:
        text += f"""
        Restaurant: {r.name}
        Type: {r.type}
        Rating: {r.rating}
        Distance: {r.dist}
        Address: {r.address}
        Description: {r.description}
        """

        restaurant_menu = [m for m in menu_items if m.restaurant_id == r.id]

        if restaurant_menu:
            text += "Menu:\n"
            for item in restaurant_menu:
                text += f"- {item.name}: {item.price}\n"

        restaurant_offers = [o for o in offers if o.restaurant_id == r.id]

        if restaurant_offers:
            text += "Offers:\n"
            for offer in restaurant_offers:
                text += f"- {offer.title}: {offer.description}\n"

        text += "\n"

    return text

# Формирование контекста истории диалога
def build_history_context(history):
    if not history:
        return ""

    lines = []
    for msg in history[-10:]:
        role = "User" if msg.role == "user" else "Assistant"
        lines.append(f"{role}: {msg.text}")

    return "\n".join(lines)

# Формирование контекста избранных заведений пользователя
def build_favorites_context(favorites):
    if not favorites:
        return "User has no favorite restaurants yet."

    lines = []
    for r in favorites:
        lines.append(f"- {r.name} ({r.type}, rating {r.rating}, price {r.price})")
    return "\n".join(lines)

# Формирование nearby-контекста по координатам пользователя
def build_nearby_context(lat: float | None, lng: float | None, restaurants: list[Restaurant], radius: int) -> str:
    if lat is None or lng is None:
        return "User coordinates were not provided."

    nearby = []

    for r in restaurants:
        if r.lat is None or r.lng is None:
            continue

        distance_m = haversine_distance(lat, lng, r.lat, r.lng)

        if distance_m <= radius:
            nearby.append((r, distance_m))

    nearby.sort(key=lambda item: item[1])

    if not nearby:
        return f"No restaurants found within {radius} meters."

    lines = []
    for restaurant, distance_m in nearby[:10]:
        dist_str = f"{round(distance_m)} m" if distance_m < 1000 else f"{distance_m / 1000:.1f} km"
        lines.append(
            f"- {restaurant.name} ({restaurant.type}, rating {restaurant.rating}, price {restaurant.price}, distance {dist_str}, open={restaurant.open})"
        )

    return "\n".join(lines)

# Генерация AI-ответа на основе БД, истории, избранного и координат
def generate_ai_response(
        message: str,
        history: list,
        favorites: list | None = None,
        db: Session = None,
        lat: float | None = None,
        lng: float | None = None,
        radius: int = 2000,
):
    favorites = favorites or []

    restaurants = db.query(Restaurant).all()
    menu_items = db.query(MenuItem).all()
    offers = db.query(Offer).all()

    restaurants_context = build_restaurants_context(restaurants, menu_items, offers)
    history_context = build_history_context(history)
    favorites_context = build_favorites_context(favorites)
    nearby_context = build_nearby_context(lat, lng, restaurants, radius)

    prompt = f"""
    You are GastroGuide AI assistant for restaurant recommendations in Astana.
    
    Available restaurants:
    
    {restaurants_context}
    
    Previous conversation:
    {history_context}
    
    Favorite restaurants of the user:
    {favorites_context}
    
    Nearby restaurants relative to the user's coordinates:
    {nearby_context}
    
    User question:
    {message}
    
    Rules:
    - Recommend only from available restaurants data
    - If the user asks about places nearby, prioritize the nearby restaurants context
    - If the user asks what is open nearby, consider restaurant.open
    - Keep continuity with previous conversation
    - Answer naturally and briefly in Russian
    """

    response = model.generate_content(prompt)

    return response.text