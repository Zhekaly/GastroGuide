import { apiGet, apiPatch, api } from './api';

export type Profile = {
  id: number;
  name: string;
  email: string;
  city: string;
  created_at: string;
  updated_at: string;
};

export type ProfileStats = {
  restaurants_count: number;
  favorites_count: number;
  top_restaurants_count: number;
};

export async function getProfileMe() {
  return apiGet<Profile>('/profile/me', true);
}

export async function getProfileStats() {
  return apiGet<ProfileStats>('/profile/stats', true);
}

export async function updateProfile(data: { name?: string; city?: string }) {
  return apiPatch<Profile>('/profile/me', data, true);
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}) {
  return apiPatch('/profile/password', data, true);
}