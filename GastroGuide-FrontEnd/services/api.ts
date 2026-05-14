import { storage } from './storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getExpoHost() {
  const constants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string };
    manifest2?: {
      extra?: {
        expoGo?: { debuggerHost?: string };
        expoClient?: { hostUri?: string };
      };
    };
  };

  const hostUri =
    Constants.expoConfig?.hostUri ??
    constants.manifest?.debuggerHost ??
    constants.manifest2?.extra?.expoGo?.debuggerHost ??
    constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) return null;

  const host = hostUri.replace(/^[a-zA-Z]+:\/\//, '').split(':')[0];
  return host || null;
}

function getDefaultApiUrl() {
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000/api/v1';
  }

  const expoHost = getExpoHost();
  return expoHost
    ? `http://${expoHost}:8000/api/v1`
    : 'http://10.50.75.126:8000/api/v1';
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();

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

  // if (!response.ok) {
  //   let message = 'API error';
  //   try {
  //     if (isJson) {
  //       const data = await response.json();
  //       message =
  //         data?.detail ||
  //         data?.error?.message ||
  //         JSON.stringify(data);
  //     } else {
  //       message = await response.text();
  //     }
  //   } catch {
  //     message = `HTTP ${response.status}`;
  //   }
  //   throw new Error(message);
  // }

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

    if (response.status === 401) {
      await storage.clearTokens();
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
