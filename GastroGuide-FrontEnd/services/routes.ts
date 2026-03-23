import { apiGet } from "./api";

export type RouteResponse = {
  distance: number;
  duration: number;
  geometry: number[][];
};

export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: string = "foot-walking"
): Promise<RouteResponse> {
  return apiGet<RouteResponse>(
    `/routes?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}&mode=${mode}`
  );
}