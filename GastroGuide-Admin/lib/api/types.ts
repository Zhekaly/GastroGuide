// Типы, отзеркаливающие admin-схемы FastAPI.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface MessageResponse {
  message: string;
}

export interface AdminTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AdminMe {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
  city: string;
  created_at: string;
}

export interface DashboardStats {
  total_restaurants: number;
  visible_restaurants: number;
  hidden_restaurants: number;
  currently_open_restaurants: number;
  total_users: number;
  active_users: number;
  admin_users: number;
  total_reviews: number;
  average_rating: number | null;
  active_offers: number;
  total_offers: number;
  total_ai_sessions: number;
  total_ai_messages: number;
  empty_ai_sessions: number;
  total_menu_items: number;
  total_categories: number;
}

export interface DashboardRestaurantSnapshot {
  id: number;
  name: string;
  type: string;
  rating: number;
  reviews: number;
}

export interface DashboardRecentReview {
  id: number;
  restaurant_id: number;
  restaurant_name: string | null;
  author_name: string | null;
  rating: number;
  text: string;
  created_at: string;
}

export interface DashboardOverview {
  stats: DashboardStats;
  top_restaurants: DashboardRestaurantSnapshot[];
  low_rated_restaurants: DashboardRestaurantSnapshot[];
  recent_reviews: DashboardRecentReview[];
}

export interface RestaurantListItem {
  id: number;
  name: string;
  type: string;
  category_id: number | null;
  category_label: string | null;
  rating: number;
  reviews: number;
  price: string;
  is_hidden: boolean;
  open: boolean;
  lat: number;
  lng: number;
  photos: string[];
  updated_at: string;
}

export interface RestaurantMenuItem {
  id: number;
  name: string;
  price: string;
  emoji: string;
  popular: boolean;
  sort_order: number;
}

export interface Restaurant {
  id: number;
  name: string;
  type: string;
  category_id: number | null;
  category_label: string | null;
  emoji: string;
  color: string;
  tag: string;
  address: string;
  phone: string;
  description: string;
  hours: string;
  opens_at: string | null;
  closes_at: string | null;
  is_24_7: boolean;
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  price: string;
  priceRange: number;
  features: string[];
  photos: string[];
  is_hidden: boolean;
  open: boolean;
  menu: RestaurantMenuItem[];
  created_at: string;
  updated_at: string;
}

export interface RestaurantInput {
  name: string;
  type: string;
  category_id: number | null;
  emoji?: string;
  color?: string;
  tag?: string;
  address: string;
  phone: string;
  description: string;
  hours: string;
  opens_at?: string | null;
  closes_at?: string | null;
  is_24_7?: boolean;
  lat: number;
  lng: number;
  price?: string;
  priceRange?: number;
  features?: string[];
  photos?: string[];
  is_hidden?: boolean;
}

export type RestaurantUpdate = Partial<RestaurantInput>;

export interface MenuItemAdmin {
  id: number;
  restaurant_id: number;
  name: string;
  price: string;
  emoji: string;
  popular: boolean;
  sort_order: number;
}

export interface MenuItemInput {
  restaurant_id: number;
  name: string;
  price: string;
  emoji?: string;
  popular?: boolean;
  sort_order?: number;
}

export interface OfferAdmin {
  id: number;
  restaurant_id: number;
  restaurant_name: string | null;
  title: string;
  description: string;
  discount: string | null;
  expires: string;
  emoji: string;
  color: string;
  active: boolean;
  created_at: string;
}

export interface OfferInput {
  restaurant_id: number;
  title: string;
  description: string;
  discount?: string | null;
  expires: string;
  emoji?: string;
  color?: string;
  active?: boolean;
}

export interface ReviewAdmin {
  id: number;
  restaurant_id: number;
  restaurant_name: string | null;
  user_id: number | null;
  author_name: string | null;
  rating: number;
  text: string;
  created_at: string;
}

export interface UserAdmin {
  id: number;
  name: string;
  email: string;
  city: string;
  role: "user" | "admin";
  is_active: boolean;
  favorites_count: number;
  reviews_count: number;
  ai_sessions_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  name?: string;
  city?: string;
  role?: "user" | "admin";
  is_active?: boolean;
}

export interface CategoryAdmin {
  id: number;
  label: string;
  sort_order: number;
  restaurants_count: number;
}

export interface CategoryInput {
  label: string;
  sort_order?: number;
}

export interface AIAnalytics {
  total_sessions: number;
  empty_sessions: number;
  total_messages: number;
  user_messages: number;
  ai_messages: number;
  top_prompts: { text: string; count: number }[];
}

export interface AISessionItem {
  id: string;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  title: string;
  preview: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIMessageItem {
  id: number;
  session_id: string;
  role: "user" | "ai";
  text: string;
  created_at: string;
}

export interface BrokenRestaurant {
  restaurant_id: number;
  restaurant_name: string;
  issues: string[];
}

export interface ActivityLogItem {
  id: number;
  admin_id: number | null;
  admin_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface GlobalSearchResults {
  restaurants: { id: number; name: string; type: string }[];
  users: { id: number; name: string; email: string }[];
  reviews: { id: number; restaurant_id: number; rating: number; text: string }[];
  menu_items: { id: number; restaurant_id: number; name: string }[];
  ai_sessions: { id: string; user_id: number; title: string }[];
}
