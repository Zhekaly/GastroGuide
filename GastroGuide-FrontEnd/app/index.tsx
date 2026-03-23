// ═══════════════════════════════════════════════════
//  app/index.tsx  ← КОРНЕВОЙ (положить в app/, НЕ в app/(tabs)/)
// ═══════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarded').then(val => {
      setTarget(val ? '/(tabs)' : '/onboarding');
    });
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FDF8F2', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E8420A" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}