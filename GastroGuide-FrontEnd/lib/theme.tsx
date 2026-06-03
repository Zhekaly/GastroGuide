import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_MODE_KEY = 'theme_mode';

export type ThemeMode = 'light' | 'dark';

export type AppThemeColors = {
  bg: string;
  dark: string;
  accent: string;
  muted: string;
  border: string;
  green: string;
  red: string;
  card: string;
  surface: string;
  elevated: string;
  tabBar: string;
  overlay: string;
  drawerBg: string;
  drawerCard: string;
  drawerBorder: string;
  drawerMuted: string;
  drawerAccent: string;
};

export const appThemeColors: Record<ThemeMode, AppThemeColors> = {
  light: {
    bg: '#FDF8F2',
    dark: '#1A1208',
    accent: '#E8420A',
    muted: '#8C7B6B',
    border: '#EDE5D8',
    green: '#2E7D32',
    red: '#D32F2F',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    tabBar: 'rgba(253,248,242,0.97)',
    overlay: 'rgba(253,248,242,0.98)',
    drawerBg: '#1A1208',
    drawerCard: '#2A1F12',
    drawerBorder: '#3A2E1E',
    drawerMuted: '#8C7B6B',
    drawerAccent: '#E8420A',
  },
  dark: {
    bg: '#12100D',
    dark: '#FFF4E8',
    accent: '#FF6A2A',
    muted: '#B8A899',
    border: '#352B22',
    green: '#5DBB63',
    red: '#FF6B6B',
    card: '#1D1813',
    surface: '#18130F',
    elevated: '#241D17',
    tabBar: 'rgba(18,16,13,0.97)',
    overlay: 'rgba(18,16,13,0.98)',
    drawerBg: '#0F0D0B',
    drawerCard: '#1D1813',
    drawerBorder: '#352B22',
    drawerMuted: '#B8A899',
    drawerAccent: '#FF6A2A',
  },
};

type AppThemeContextValue = {
  mode: ThemeMode;
  colors: AppThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleDark: (enabled: boolean) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then(value => {
      if (value === 'dark' || value === 'light') {
        setModeState(value);
      }
    });
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(THEME_MODE_KEY, nextMode);
  }, []);

  const toggleDark = useCallback(
    async (enabled: boolean) => {
      await setMode(enabled ? 'dark' : 'light');
    },
    [setMode],
  );

  const value = useMemo(
    () => ({
      mode,
      colors: appThemeColors[mode],
      isDark: mode === 'dark',
      setMode,
      toggleDark,
    }),
    [mode, setMode, toggleDark],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}
