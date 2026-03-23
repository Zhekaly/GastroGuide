// Stub for react-native-maps on web
import React from 'react';
import { View, Text } from 'react-native';

export const MapView = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text>Map not available on web</Text>
  </View>
);

export const Marker = () => null;

export const PROVIDER_GOOGLE = 'google';

export default MapView;