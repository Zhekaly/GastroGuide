import { apiGet } from "./api";

export type Offer = {
  id: number;
  restaurantId: number;
  title: string;
  description: string;
  discount: string;
  expires: string;
  emoji: string;
  color: string;
};

export async function getOffers(): Promise<Offer[]> {
  return apiGet<Offer[]>("/offers");
}

export async function getOfferById(id: number): Promise<Offer> {
  return apiGet<Offer>(`/offers/${id}`);
}

export async function getRestaurantOffers(id: number): Promise<Offer[]> {
  return apiGet<Offer[]>(`/restaurants/${id}/offer`);
}