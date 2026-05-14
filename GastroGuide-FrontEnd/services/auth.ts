import { apiPost } from './api';
import { storage } from './storage';

export const authService = {
  async register(name: string, email: string, password: string, city: string) {
    await apiPost('/auth/register', {
      name,
      email,
      password,
      city,
    });

    const tokens = await apiPost<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>('/auth/login', {
      email,
      password,
    });

    await storage.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },

  async login(email: string, password: string) {
    const data = await apiPost<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>('/auth/login', {
      email,
      password,
    });

    await storage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async logout() {
    await storage.clearSession();
  },

  async isAuthenticated() {
    const token = await storage.getAccessToken();
    return !!token;
  },
};
