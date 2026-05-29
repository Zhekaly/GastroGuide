import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  // Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFavorites } from '../../services/favorites';
import { getProfileMe, getProfileStats, Profile, ProfileStats } from '../../services/profile';
import { Restaurant } from '../../services/restaurants';
import { authService } from '../../services/auth';
// import { getRestaurantImage } from '../../utils/restaurantImages';
import { getRestaurantImageSource } from '../../utils/restaurantImages';
import { Image } from 'expo-image';

const C = {
  bg: '#FDF8F2', dark: '#1A1208', accent: '#E8420A',
  muted: '#8C7B6B', border: '#EDE5D8', green: '#2E7D32', red: '#D32F2F',
};

function isAuthError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes('Could not validate credentials') ||
    err.message.includes('401')
  );
}

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [isGuest, setIsGuest] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const insets = useSafeAreaInsets();

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);

      const authenticated = await authService.isAuthenticated();
      setIsGuest(!authenticated);

      if (!authenticated) {
        setProfile(null);
        setStats(null);
        setFavorites([]);
        return;
      }

      const [profileData, statsData, favoritesData] = await Promise.all([
        getProfileMe(),
        getProfileStats(),
        getFavorites(),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setFavorites(favoritesData);
    } catch (err) {
      if (!isAuthError(err)) {
        console.error('Failed to load profile data:', err);
      }

      setIsGuest(true);
      setProfile(null);
      setStats(null);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
          } finally {
            setIsGuest(true);
            setProfile(null);
            setStats(null);
            setFavorites([]);
            router.replace('/onboarding');
          }
        },
      },
    ]);
  };

  const statsCards = isGuest || !stats
    ? [
        { icon: <Ionicons name="restaurant-outline" size={20} color={C.accent} />, value: '0', label: 'Мест' },
        { icon: <Ionicons name="heart" size={20} color={C.accent} />, value: '0', label: 'Сохранено' },
        { icon: <Ionicons name="star" size={20} color={C.accent} />, value: '0', label: 'Топ мест' },
      ]
    : [
        { icon: <Ionicons name="restaurant-outline" size={20} color={C.accent} />, value: String(stats.restaurants_count), label: 'Мест' },
        { icon: <Ionicons name="heart" size={20} color={C.accent} />, value: String(stats.favorites_count), label: 'Сохранено' },
        { icon: <Ionicons name="star" size={20} color={C.accent} />, value: String(stats.top_restaurants_count), label: 'Топ мест' },
      ];

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: C.dark, fontWeight: '700' }}>Загрузка профиля...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[s.header, { paddingTop: insets.top + 24 }]}>
          <View style={s.avatarWrap}>
            <Ionicons name="person" size={38} color={C.accent} />
          </View>

          <Text style={s.name}>{isGuest ? 'Гость' : profile?.name ?? 'Пользователь'}</Text>
          <Text style={s.email}>
            {isGuest ? 'Астана, Казахстан' : `${profile?.email ?? ''} · ${profile?.city ?? ''}`}
          </Text>

          {isGuest ? (
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => router.push({ pathname: '/onboarding', params: { initialScreen: 'auth' } })}
            >
              <Feather name="edit-2" size={12} color={C.accent} style={{ marginRight: 6 }} />
              <Text style={s.editBtnText}>Войти / Зарегистрироваться</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => router.push({ pathname: '/edit-profile' as any })}
            >
              <Feather name="edit-2" size={12} color={C.accent} style={{ marginRight: 6 }} />
              <Text style={s.editBtnText}>Редактировать профиль</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.statsRow}>
          {statsCards.map(st => (
            <View key={st.label} style={s.statCard}>
              {st.icon}
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>ИЗБРАННОЕ</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>{favorites.length} мест</Text>
          </View>

          {isGuest ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Войдите в аккаунт, чтобы сохранять любимые заведения</Text>
            </View>
          ) : favorites.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>У вас пока нет избранных заведений</Text>
            </View>
          ) : (
            favorites.map(r => (
              <TouchableOpacity
                key={r.id}
                style={s.card}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/detail', params: { id: r.id } })}
              >
                {/* <Image source={getRestaurantImage(r.id)} style={s.cardImage} /> */}
                <Image
                  source={getRestaurantImageSource(r)}
                  style={s.cardImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{r.name}</Text>
                  <Text style={s.cardSub}>{r.type} · ⭐ {r.rating} · {r.dist}</Text>
                </View>
                <Ionicons name="heart" size={18} color={C.red} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>НАСТРОЙКИ</Text>
          <View style={s.settingsCard}>
            <View style={s.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.settingIconWrap}>
                  <Ionicons name="notifications-outline" size={18} color={C.accent} />
                </View>
                <View>
                  <Text style={s.settingLabel}>Уведомления</Text>
                  <Text style={s.settingSub}>Акции и новые места</Text>
                </View>
              </View>
              <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: C.border, true: C.accent + '80' }} thumbColor={notifications ? C.accent : '#fff'} />
            </View>
            <View style={s.divider} />
            <View style={s.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.settingIconWrap}>
                  <Ionicons name="location-outline" size={18} color={C.accent} />
                </View>
                <View>
                  <Text style={s.settingLabel}>Геолокация</Text>
                  <Text style={s.settingSub}>Для точного расстояния</Text>
                </View>
              </View>
              <Switch value={location} onValueChange={setLocation} trackColor={{ false: C.border, true: C.accent + '80' }} thumbColor={location ? C.accent : '#fff'} />
            </View>
            <View style={s.divider} />
            <View style={s.settingRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.settingIconWrap}>
                  <Ionicons name="moon-outline" size={18} color={C.muted} />
                </View>
                <View>
                  <Text style={s.settingLabel}>Тёмная тема</Text>
                  <Text style={s.settingSub}>Скоро доступно</Text>
                </View>
              </View>
              <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: C.border, true: C.accent + '80' }} thumbColor={darkMode ? C.accent : '#fff'} disabled />
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>ПРОЧЕЕ</Text>
          <View style={s.menuCard}>
            {[
              { icon: <Ionicons name="language-outline" size={16} color={C.muted} />, label: 'Язык', value: 'Русский' },
              { icon: <Ionicons name="document-text-outline" size={16} color={C.muted} />, label: 'Условия использования', value: '' },
              { icon: <Ionicons name="lock-closed-outline" size={16} color={C.muted} />, label: 'Политика конфиденциальности', value: '' },
              { icon: <Ionicons name="chatbubble-outline" size={16} color={C.muted} />, label: 'Обратная связь', value: '' },
              { icon: <Ionicons name="star-outline" size={16} color={C.muted} />, label: 'Оценить приложение', value: '' },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <TouchableOpacity style={s.menuRow}>
                  <View style={{ width: 28, alignItems: 'center' }}>{item.icon}</View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Text style={s.menuValue}>{item.value}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.muted} />
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
        </View>

        <Text style={s.version}>GastroGuide v1.0.0 · Астана 🇰🇿</Text>

        {!isGuest && (
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color={C.red} style={{ marginRight: 8 }} />
            <Text style={s.logoutText}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { alignItems: 'center', paddingBottom: 20, paddingHorizontal: 20 },
  avatarWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.accent + '18', borderWidth: 2, borderColor: C.accent + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '900', color: C.dark, marginBottom: 4 },
  email: { fontSize: 13, color: C.muted, marginBottom: 14, textAlign: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 9, backgroundColor: C.accent + '12', borderWidth: 1.5, borderColor: C.accent + '30', borderRadius: 20 },
  editBtnText: { fontSize: 12, color: C.accent, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '900', color: C.dark },
  statLabel: { fontSize: 9, color: C.muted },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: C.dark, letterSpacing: 1, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 16, marginBottom: 8 },
  cardImage: { width: 46, height: 46, borderRadius: 13, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.dark },
  cardSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  emptyBox: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 16 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center' },
  settingsCard: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 18, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.accent + '10', alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600', color: C.dark },
  settingSub: { fontSize: 10, color: C.muted, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },
  menuCard: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 18, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.dark, marginLeft: 2 },
  menuValue: { fontSize: 12, color: C.muted, marginRight: 8 },
  version: { textAlign: 'center', fontSize: 11, color: C.muted, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 20, padding: 14, borderWidth: 1.5, borderColor: C.red + '40', borderRadius: 16, backgroundColor: C.red + '08' },
  logoutText: { fontSize: 14, color: C.red, fontWeight: '700' },
});
