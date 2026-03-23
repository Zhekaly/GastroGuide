import { apiDelete, apiGet, apiPost } from './api';
import type { Restaurant } from './restaurants';

export async function getFavorites() {
  return apiGet<Restaurant[]>('/favorites', true);
}

export async function addFavorite(restaurantId: number) {
  return apiPost(`/favorites/${restaurantId}`, undefined, true);
}

export async function removeFavorite(restaurantId: number) {
  return apiDelete(`/favorites/${restaurantId}`, true);
}