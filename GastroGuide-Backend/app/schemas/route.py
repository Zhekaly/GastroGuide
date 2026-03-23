# Pydantic-схемы маршрута.
# Используются для возврата расстояния, длительности
# и координат построенного маршрута.

from pydantic import BaseModel


class RouteResponse(BaseModel):
    distance: float
    duration: float
    geometry: list[list[float]]