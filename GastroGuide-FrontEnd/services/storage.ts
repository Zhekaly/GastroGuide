import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const ONBOARDED_KEY = 'onboarded';

export const storage = {
  async setTokens(access: string, refresh: string) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, access],
      [REFRESH_KEY, refresh],
    ]);
  },

  async getAccessToken() {
    return await AsyncStorage.getItem(ACCESS_KEY);
  },

  async getRefreshToken() {
    return await AsyncStorage.getItem(REFRESH_KEY);
  },

  async clearTokens() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  },

  async clearSession() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, ONBOARDED_KEY]);
  },
};
