// ═══════════════════════════════════════════════════
//  app/_layout.tsx  ← КОРНЕВОЙ (не внутри (tabs)!)
// ═══════════════════════════════════════════════════
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
 
// ▼ ЭТО КЛЮЧЕВОЕ — говорит expo-router стартовать с onboarding
export const unstable_settings = {
  initialRouteName: 'onboarding',
};
 
export default function RootLayout() {
  const colorScheme = useColorScheme();
 
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}