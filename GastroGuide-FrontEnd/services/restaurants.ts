import { apiGet } from "./api";

export type Category = {
  id: number;
  label: string;
  sort_order: number;
};

export type MenuItem = {
  id: number;
  restaurantId: number;
  name: string;
  price: string;
  emoji: string;
  popular: boolean;
};

export type Restaurant = {
  id: number;
  name: string;
  type: string;
  emoji: string;
  color: string;
  tag: string;
  rating: number;
  reviews: number;
  dist: string;
  time: string;
  price: string;
  open: boolean;
  address: string;
  phone: string;
  description: string;
  hours: string;
  lat: number;
  lng: number;
  features: string[];
  photos: string[];
  priceRange: number;
  createdAt: string;
  updatedAt: string;
  menu: MenuItem[];
  category_id?: number | null;
};

// Пока категории оставляем локальными, потому что на backend отдельного endpoint под них нет
// export const CATEGORIES: Category[] = [
//   { id: 1, emoji: '🇰🇿', label: 'Казахская' },
//   { id: 2, emoji: '🍣', label: 'Японская' },
//   { id: 3, emoji: '🍕', label: 'Итальянская' },
//   { id: 4, emoji: '🥩', label: 'Гриль' },
//   { id: 5, emoji: '🌿', label: 'Вегетарианская' },
//   { id: 6, emoji: '☕', label: 'Кофейня' },
//   { id: 7, emoji: '🍜', label: 'Азиатская' },
//   { id: 8, emoji: '🥗', label: 'ЗОЖ' },
// ];

export async function getRestaurants(lat?: number, lng?: number): Promise<Restaurant[]> {
  const params = new URLSearchParams();

  if (lat !== undefined && lng !== undefined) {
    params.append('lat', String(lat));
    params.append('lng', String(lng));
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiGet<Restaurant[]>(`/restaurants${query}`);
}

export async function getRestaurantById(id: number): Promise<Restaurant> {
  return apiGet<Restaurant>(`/restaurants/${id}`);
}

export async function getRestaurantMenu(id: number): Promise<MenuItem[]> {
  return apiGet<MenuItem[]>(`/restaurants/${id}/menu`);
}

export async function searchRestaurants(
  q: string,
  lat?: number,
  lng?: number
): Promise<Restaurant[]> {
  const params = new URLSearchParams({ q });

  if (lat !== undefined && lng !== undefined) {
    params.append('lat', String(lat));
    params.append('lng', String(lng));
  }

  return apiGet<Restaurant[]>(`/restaurants/search?${params.toString()}`);
}

export async function getNearbyRestaurants(lat: number, lng: number, radius: number): Promise<Restaurant[]> {
  return apiGet<Restaurant[]>(
    `/restaurants/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
  );
}

export async function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/categories");
}