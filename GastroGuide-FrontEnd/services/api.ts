import { storage } from './storage';

const BASE_URL = 'http://192.168.1.78:8000/api/v1';
// const BASE_URL = 'http://127.0.0.1:8000/api/v1';

async function request<T = any>(
  url: string,
  options: RequestInit = {},
  auth: boolean = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = await storage.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let message = 'API error';
    try {
      if (isJson) {
        const data = await response.json();
        message =
          data?.detail ||
          data?.error?.message ||
          JSON.stringify(data);
      } else {
        message = await response.text();
      }
    } catch {
      message = `HTTP ${response.status}`;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return isJson ? ((await response.json()) as T) : ((await response.text()) as T);
}

// Новый стиль
export const api = {
  get: <T = any>(url: string, auth = false) =>
    request<T>(url, { method: 'GET' }, auth),

  post: <T = any>(url: string, body?: any, auth = false) =>
    request<T>(
      url,
      {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      auth
    ),

  patch: <T = any>(url: string, body?: any, auth = false) =>
    request<T>(
      url,
      {
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      auth
    ),

  delete: <T = any>(url: string, auth = false) =>
    request<T>(url, { method: 'DELETE' }, auth),
};

// Обратная совместимость со старым фронтом
export const apiGet = <T = any>(url: string, auth = false) =>
  api.get<T>(url, auth);

export const apiPost = <T = any>(url: string, body?: any, auth = false) =>
  api.post<T>(url, body, auth);

export const apiPatch = <T = any>(url: string, body?: any, auth = false) =>
  api.patch<T>(url, body, auth);

export const apiDelete = <T = any>(url: string, auth = false) =>
  api.delete<T>(url, auth);