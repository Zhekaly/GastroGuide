import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export type Review = {
  id: number;
  restaurant_id: number;
  user_id: number | null;
  author_name: string | null;
  rating: number;
  text: string;
  created_at: string;
};

export async function getReviewsByRestaurant(restaurantId: number) {
  return apiGet<Review[]>(`/reviews/${restaurantId}`);
}

export async function createReview(
  restaurantId: number,
  data: { rating: number; text: string }
) {
  return apiPost<Review>(`/reviews/${restaurantId}`, data, true);
}

export async function updateReview(
  restaurantId: number,
  data: { rating: number; text: string }
) {
  return apiPatch<Review>(`/reviews/${restaurantId}`, data, true);
}

// export async function deleteReview(restaurantId: number) {
//   return apiDelete(`/reviews/${restaurantId}`, true);
// }