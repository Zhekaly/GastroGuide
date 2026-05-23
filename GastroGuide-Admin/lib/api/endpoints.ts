import { apiFetch } from "@/lib/api/client";
import type {
  ActivityLogItem,
  AIAnalytics,
  AIMessageItem,
  AISessionItem,
  AdminMe,
  AdminTokenResponse,
  BrokenRestaurant,
  CategoryAdmin,
  CategoryInput,
  DashboardOverview,
  GlobalSearchResults,
  MenuItemAdmin,
  MenuItemInput,
  MessageResponse,
  OfferAdmin,
  OfferInput,
  Paginated,
  Restaurant,
  RestaurantInput,
  RestaurantListItem,
  RestaurantUpdate,
  ReviewAdmin,
  UserAdmin,
  UserUpdate,
} from "@/lib/api/types";

// ===== Auth =====
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AdminTokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => apiFetch<AdminMe>("/auth/me"),
};

// ===== Dashboard =====
export const dashboardApi = {
  overview: () => apiFetch<DashboardOverview>("/dashboard"),
};

// ===== Restaurants =====
export const restaurantsApi = {
  list: (params: {
    q?: string;
    category_id?: number | null;
    is_hidden?: boolean | null;
    page?: number;
    page_size?: number;
  } = {}) =>
    apiFetch<Paginated<RestaurantListItem>>("/restaurants", {
      query: {
        q: params.q,
        category_id: params.category_id ?? undefined,
        is_hidden: params.is_hidden ?? undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    }),
  get: (id: number) => apiFetch<Restaurant>(`/restaurants/${id}`),
  create: (data: RestaurantInput) =>
    apiFetch<Restaurant>("/restaurants", { method: "POST", body: data }),
  update: (id: number, data: RestaurantUpdate) =>
    apiFetch<Restaurant>(`/restaurants/${id}`, { method: "PATCH", body: data }),
  remove: (id: number) =>
    apiFetch<MessageResponse>(`/restaurants/${id}`, { method: "DELETE" }),
  toggleVisibility: (id: number) =>
    apiFetch<Restaurant>(`/restaurants/${id}/toggle-visibility`, { method: "POST" }),
  recalculateRating: (id: number) =>
    apiFetch<Restaurant>(`/restaurants/${id}/recalculate-rating`, { method: "POST" }),
  bulk: (ids: number[], action: "hide" | "show" | "delete" | "recalculate") =>
    apiFetch<MessageResponse>("/restaurants/bulk", {
      method: "POST",
      body: { ids, action },
    }),
};

// ===== Menu items =====
export const menuApi = {
  list: (restaurant_id?: number | null) =>
    apiFetch<MenuItemAdmin[]>("/menu-items", {
      query: { restaurant_id: restaurant_id ?? undefined },
    }),
  create: (data: MenuItemInput) =>
    apiFetch<MenuItemAdmin>("/menu-items", { method: "POST", body: data }),
  update: (id: number, data: Partial<MenuItemInput>) =>
    apiFetch<MenuItemAdmin>(`/menu-items/${id}`, { method: "PATCH", body: data }),
  remove: (id: number) =>
    apiFetch<MessageResponse>(`/menu-items/${id}`, { method: "DELETE" }),
};

// ===== Offers =====
export const offersApi = {
  list: (active?: boolean | null) =>
    apiFetch<OfferAdmin[]>("/offers", {
      query: { active: active ?? undefined },
    }),
  create: (data: OfferInput) =>
    apiFetch<OfferAdmin>("/offers", { method: "POST", body: data }),
  update: (id: number, data: Partial<OfferInput>) =>
    apiFetch<OfferAdmin>(`/offers/${id}`, { method: "PATCH", body: data }),
  remove: (id: number) =>
    apiFetch<MessageResponse>(`/offers/${id}`, { method: "DELETE" }),
};

// ===== Reviews =====
export const reviewsApi = {
  list: (params: {
    q?: string;
    rating?: number | null;
    rating_lte?: number | null;
    restaurant_id?: number | null;
    user_id?: number | null;
    page?: number;
    page_size?: number;
  } = {}) =>
    apiFetch<Paginated<ReviewAdmin>>("/reviews", {
      query: {
        q: params.q,
        rating: params.rating ?? undefined,
        rating_lte: params.rating_lte ?? undefined,
        restaurant_id: params.restaurant_id ?? undefined,
        user_id: params.user_id ?? undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    }),
  remove: (id: number) =>
    apiFetch<MessageResponse>(`/reviews/${id}`, { method: "DELETE" }),
};

// ===== Users =====
export const usersApi = {
  list: (params: {
    q?: string;
    role?: "user" | "admin" | "moderator" | null;
    is_active?: boolean | null;
    page?: number;
    page_size?: number;
  } = {}) =>
    apiFetch<Paginated<UserAdmin>>("/users", {
      query: {
        q: params.q,
        role: params.role ?? undefined,
        is_active: params.is_active ?? undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    }),
  get: (id: number) => apiFetch<UserAdmin>(`/users/${id}`),
  update: (id: number, data: UserUpdate) =>
    apiFetch<UserAdmin>(`/users/${id}`, { method: "PATCH", body: data }),
  remove: (id: number) =>
    apiFetch<MessageResponse>(`/users/${id}`, { method: "DELETE" }),
};

// ===== Categories =====
export const categoriesApi = {
  list: () => apiFetch<CategoryAdmin[]>("/categories"),
  create: (data: CategoryInput) =>
    apiFetch<CategoryAdmin>("/categories", { method: "POST", body: data }),
  update: (id: number, data: Partial<CategoryInput>) =>
    apiFetch<CategoryAdmin>(`/categories/${id}`, { method: "PATCH", body: data }),
  remove: (id: number) =>
    apiFetch<MessageResponse>(`/categories/${id}`, { method: "DELETE" }),
  reorder: (ordered_ids: number[]) =>
    apiFetch<CategoryAdmin[]>("/categories/reorder", {
      method: "POST",
      body: { ordered_ids },
    }),
};

// ===== AI =====
export const aiApi = {
  analytics: () => apiFetch<AIAnalytics>("/ai/analytics"),
  listSessions: (params: {
    user_id?: number | null;
    only_empty?: boolean;
    page?: number;
    page_size?: number;
  } = {}) =>
    apiFetch<Paginated<AISessionItem>>("/ai/sessions", {
      query: {
        user_id: params.user_id ?? undefined,
        only_empty: params.only_empty ? "true" : undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    }),
  sessionMessages: (id: string) =>
    apiFetch<AIMessageItem[]>(`/ai/sessions/${id}/messages`),
  deleteSession: (id: string) =>
    apiFetch<MessageResponse>(`/ai/sessions/${id}`, { method: "DELETE" }),
  cleanupEmpty: () =>
    apiFetch<MessageResponse>("/ai/sessions/cleanup-empty", { method: "POST" }),
};

// ===== System =====
export const systemApi = {
  broken: () => apiFetch<BrokenRestaurant[]>("/system/broken-restaurants"),
  recalcAll: () =>
    apiFetch<MessageResponse>("/system/recalculate-all-ratings", {
      method: "POST",
    }),
  activityLog: (params: { action?: string; entity_type?: string; page?: number; page_size?: number } = {}) =>
    apiFetch<Paginated<ActivityLogItem>>("/system/activity-log", {
      query: {
        action: params.action,
        entity_type: params.entity_type,
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
      },
    }),
  search: (q: string) =>
    apiFetch<GlobalSearchResults>("/system/search", { query: { q } }),
  resetSequences: () =>
    apiFetch<{ message: string; result: Record<string, number> }>(
      "/system/reset-sequences",
      { method: "POST" }
    ),
};

// ===== Upload =====
export const uploadApi = {
  image: async (file: File, folder = "restaurants") => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string; key: string; content_type: string; size: number }>(
      `/upload/image?folder=${encodeURIComponent(folder)}`,
      { method: "POST", body: fd },
    );
  },
};
