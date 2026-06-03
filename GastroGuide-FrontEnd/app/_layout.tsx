// ═══════════════════════════════════════════════════
//  app/_layout.tsx  ← КОРНЕВОЙ (не внутри (tabs)!)
// ═══════════════════════════════════════════════════
import { AppThemeProvider, useAppTheme } from '@/lib/theme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
 
// ▼ ЭТО КЛЮЧЕВОЕ — говорит expo-router стартовать с onboarding
export const unstable_settings = {
  initialRouteName: 'onboarding',
};
 
export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.accent,
          background: colors.bg,
          card: colors.card,
          text: colors.dark,
          border: colors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.accent,
          background: colors.bg,
          card: colors.card,
          text: colors.dark,
          border: colors.border,
        },
      };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false, // скрываем хедер у ВСЕХ экранов
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="detail" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
