# Сервисный модуль для геолокации.
# Содержит вспомогательные функции расчёта расстояния между координатами,
# используемые в nearby-поиске и AI nearby-контексте.

import math


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000  # meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return r * c