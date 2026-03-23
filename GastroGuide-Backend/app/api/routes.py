# Endpoint построения маршрута между пользователем и заведением.
# Использует OpenRouteService API.

import requests
from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings

from app.schemas.route import RouteResponse

router = APIRouter(prefix="/api/v1/routes", tags=["Routes"])

@router.get("", response_model=RouteResponse)

@router.get("")
def get_route(
    originLat: float = Query(...),
    originLng: float = Query(...),
    destLat: float = Query(...),
    destLng: float = Query(...),
    mode: str = Query("foot-walking")
):
    url = f"https://api.openrouteservice.org/v2/directions/{mode}/geojson"

    headers = {
        "Authorization": settings.ors_api_key,
        "Content-Type": "application/json",
    }

    body = {
        "coordinates": [
            [originLng, originLat],
            [destLng, destLat],
        ]
    }

    try:
        response = requests.post(url, json=body, headers=headers, timeout=30)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Routing service unavailable: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"ORS error: {response.text}")

    data = response.json()

    try:
        route = data["features"][0]
        summary = route["properties"]["summary"]
        geometry = route["geometry"]["coordinates"]

        return {
            "distance": summary["distance"],
            "duration": summary["duration"],
            "geometry": geometry,
        }
    except (KeyError, IndexError):
        raise HTTPException(status_code=500, detail="Invalid routing response format")