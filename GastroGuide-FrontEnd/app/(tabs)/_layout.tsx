import { HapticTab } from '@/components/haptic-tab';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const C = {
  accent: '#E8420A',
  muted: '#8C7B6B',
  bg: '#FDF8F2',
  border: '#EDE5D8',
};

function TabIcon({ name, focused, isAI }: {
  name: string;
  focused: boolean;
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
        color={focused ? C.accent : C.muted}
      />
    </View>
  );
}

function ProfileIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.profileWrap, focused && styles.profileWrapActive]}>
      <View style={[styles.profileAvatar, focused && styles.profileAvatarActive]}>
        <Ionicons name="person" size={16} color={focused ? C.accent : C.muted} />
      </View>
    </View>
  );
}

export default function TabLayout() {
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
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="" focused={focused} isAI />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Поиск',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => (
            <ProfileIcon focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(253,248,242,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#EDE5D8',
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
    backgroundColor: 'rgba(232,66,10,0.12)',
  },

  // AI center button
  aiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8420A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    shadowColor: '#E8420A',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },

  // Profile tab
  profileWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileWrapActive: {
    backgroundColor: 'rgba(232,66,10,0.08)',
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EDE5D8',
    borderWidth: 1.5,
    borderColor: '#D4C4A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarActive: {
    backgroundColor: 'rgba(232,66,10,0.15)',
    borderColor: '#E8420A',
  },
});