import { HapticTab } from '@/components/haptic-tab';
import { AppThemeColors, useAppTheme } from '@/lib/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

function TabIcon({
  name,
  focused,
  colors,
  styles,
  isAI,
}: {
  name: string;
  focused: boolean;
  colors: AppThemeColors;
  styles: ReturnType<typeof createStyles>;
  isAI?: boolean;
}) {
  if (isAI) {
    return (
      <View style={styles.aiBtn}>
        <MaterialCommunityIcons name="star-four-points" size={18} color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={name as any}
        size={22}
        color={focused ? colors.accent : colors.muted}
      />
    </View>
  );
}

function ProfileIcon({
  focused,
  colors,
  styles,
}: {
  focused: boolean;
  colors: AppThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.profileWrap, focused && styles.profileWrapActive]}>
      <View style={[styles.profileAvatar, focused && styles.profileAvatarActive]}>
        <Ionicons name="person" size={16} color={focused ? colors.accent : colors.muted} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { colors: C } = useAppTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} colors={C} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} colors={C} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="" focused={focused} colors={C} styles={styles} isAI />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Поиск',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} colors={C} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => (
            <ProfileIcon focused={focused} colors={C} styles={styles} />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (C: AppThemeColors) => StyleSheet.create({
  tabBar: {
    backgroundColor: C.tabBar,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: 8,
    paddingTop: 4,
    height: 62,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: C.accent + '1F',
  },
  aiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    shadowColor: C.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  profileWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileWrapActive: {
    backgroundColor: C.accent + '14',
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.border,
    borderWidth: 1.5,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarActive: {
    backgroundColor: C.accent + '26',
    borderColor: C.accent,
  },
});
