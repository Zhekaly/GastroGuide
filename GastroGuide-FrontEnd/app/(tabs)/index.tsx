import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategories, getRestaurants, Restaurant, Category } from '../../services/restaurants';
import { getOffers, Offer } from '../../services/offers';
import { getRestaurantImage } from '../../utils/restaurantImages';

const C = {
  bg: '#FDF8F2', dark: '#1A1208', accent: '#E8420A',
  muted: '#8C7B6B', border: '#EDE5D8', green: '#2E7D32',
};

// Маппинг категорий на иконки Ionicons
const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  'Все':        'restaurant-outline',
  'Казахская':  'leaf-outline',
  'Японская':   'fish-outline',
  'Итальянская':'pizza-outline',
  'Фастфуд':    'fast-food-outline',
  'Кофейня':    'cafe-outline',
  'Бургеры':    'restaurant-outline',
  'Пицца':      'pizza-outline',
  'Суши':       'fish-outline',
  'Веган':      'leaf-outline',
};

function getCategoryIcon(label: string): React.ComponentProps<typeof Ionicons>['name'] {
  return CATEGORY_ICONS[label] ?? 'restaurant-outline';
}

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [restaurantsData, offersData, categoriesData] = await Promise.all([
        getRestaurants(),
        getOffers(),
        getCategories(),
      ]);

      setRestaurants(restaurantsData);
      setOffers(offersData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load home data:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const featured = restaurants.filter(r => r.rating >= 4.7).slice(0, 3);
  const nearby = restaurants.filter(r => parseInt(r.dist) < 700);
  const open = restaurants.filter(r => r.open);

  const allCategories = [
    { id: 0, label: 'Все', sort_order: 0 },
    ...categories,
  ];

  const displayed = activeCategory && activeCategory !== 0
    ? restaurants.filter(r => r.category_id === activeCategory)
    : restaurants;

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.dark, fontSize: 16, fontWeight: '700' }}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: '#D32F2F', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeCategoryLabel = allCategories.find(c => c.id === activeCategory)?.label ?? '';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={s.greeting}>Добрый день</Text>
            <Text style={s.subtitle}>Астана · Что поедим сегодня?</Text>
          </View>
          <TouchableOpacity
            style={s.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person-outline" size={20} color={C.dark} />
          </TouchableOpacity>
        </View>

        {/* AI Banner */}
        <TouchableOpacity
          style={s.aiBanner}
          onPress={() => router.push('/(tabs)/ai')}
          activeOpacity={0.85}
        >
          <View style={s.aiIcon}>
            <MaterialCommunityIcons name="star-four-points" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiTitle}>Спросите AI Гастрогида</Text>
            <Text style={s.aiSub}>«Хочу острое», «До 2000 ₸», «Для свидания»</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={C.accent} />
        </TouchableOpacity>

        {/* Stats bar */}
        <View style={s.statsBar}>
          <View style={s.statItem}>
            <Text style={s.statNum}>{open.length}</Text>
            <Text style={s.statLbl}>Открыто</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{nearby.length}</Text>
            <Text style={s.statLbl}>Рядом</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{featured.length}</Text>
            <Text style={s.statLbl}>Топ</Text>
          </View>
        </View>

        {/* Special Offers */}
        {offers.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="flame" size={12} color={C.accent} />
                <Text style={s.sectionTitle}>АКЦИИ</Text>
              </View>
              <Text style={s.sectionLink}>Все →</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {offers.map(offer => {
                const rest = restaurants.find(r => r.id === offer.restaurantId);
                return (
                  <TouchableOpacity
                    key={offer.restaurantId}
                    style={[s.offerCard, { borderColor: offer.color + '30', backgroundColor: offer.color + '08' }]}
                    onPress={() => router.push({ pathname: '/detail', params: { id: offer.restaurantId } })}
                    activeOpacity={0.8}
                  >
                    <View style={[s.offerBadge, { backgroundColor: offer.color }]}>
                      <Text style={s.offerBadgeText}>{offer.discount}</Text>
                    </View>
                    <View style={[s.offerIconWrap, { backgroundColor: offer.color + '20' }]}>
                      <Ionicons name="pricetag" size={32} color={offer.color} />
                    </View>
                    <Text style={[s.offerTitle, { color: offer.color }]}>{offer.title}</Text>
                    <Text style={s.offerDesc} numberOfLines={2}>{offer.description}</Text>
                    {rest && <Text style={s.offerRest} numberOfLines={1}>{rest.name}</Text>}
                    <Text style={s.offerExpires}>до {offer.expires}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Ionicons name="restaurant-outline" size={12} color={C.dark} />
            <Text style={[s.sectionTitle, { marginBottom: 10 }]}>КУХНИ</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {allCategories.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[s.catChip, activeCategory === c.id && s.catChipActive]}
                onPress={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
              >
                <Ionicons
                  name={getCategoryIcon(c.label)}
                  size={14}
                  color={activeCategory === c.id ? '#fff' : C.muted}
                />
                <Text style={[s.catText, activeCategory === c.id && { color: '#fff' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Top Rated */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="star" size={12} color="#F5A623" />
              <Text style={s.sectionTitle}>ЛУЧШИЕ</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={s.sectionLink}>Все →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {featured.map(r => (
              <TouchableOpacity
                key={r.id}
                style={s.featCard}
                onPress={() => router.push({ pathname: '/detail', params: { id: r.id } })}
                activeOpacity={0.8}
              >
                <Image source={getRestaurantImage(r.id)} style={s.featImage} />
                <View style={[s.featBadge, { backgroundColor: r.color + '18', borderColor: r.color + '35' }]}>
                  <Text style={[s.featBadgeText, { color: r.color }]}>{r.tag}</Text>
                </View>
                <Text style={s.featName} numberOfLines={1}>{r.name}</Text>
                <Text style={s.featType} numberOfLines={1}>{r.type}</Text>
                <View style={s.featMeta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={9} color="#F5A623" />
                    <Text style={s.featMetaText}>{r.rating}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="location-outline" size={9} color={C.muted} />
                    <Text style={s.featMetaText}>{r.dist}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: r.open ? C.green : '#D32F2F' }} />
                  <Text style={[s.featOpen, { color: r.open ? C.green : '#D32F2F' }]}>
                    {r.open ? 'Открыто' : 'Закрыто'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All / Filtered Restaurants */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <View style={s.sectionTitleRow}>
              <Ionicons
                name={activeCategory ? getCategoryIcon(activeCategoryLabel) : 'location-outline'}
                size={12}
                color={C.dark}
              />
              <Text style={s.sectionTitle}>
                {activeCategory ? activeCategoryLabel.toUpperCase() : 'ВСЕ ЗАВЕДЕНИЯ'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: C.muted }}>{displayed.length} мест</Text>
          </View>
          {displayed.map(r => (
            <TouchableOpacity
              key={r.id}
              style={s.card}
              onPress={() => router.push({ pathname: '/detail', params: { id: r.id } })}
              activeOpacity={0.8}
            >
              <Image source={getRestaurantImage(r.id)} style={s.cardImage} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={s.cardName}>{r.name}</Text>
                  <View style={[s.tag, { backgroundColor: r.color + '18', borderColor: r.color + '35' }]}>
                    <Text style={[s.tagText, { color: r.color }]}>{r.tag}</Text>
                  </View>
                </View>
                <Text style={s.cardSub}>
                  {r.type} · {r.price} ·{' '}
                  <Text style={{ color: r.open ? C.green : '#D32F2F', fontWeight: '600' }}>
                    {r.open ? 'Открыто' : 'Закрыто'}
                  </Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={s.metaRow}>
                    <Ionicons name="star" size={10} color="#F5A623" />
                    <Text style={s.meta}>{r.rating}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={10} color={C.muted} />
                    <Text style={s.meta}>{r.dist}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="time-outline" size={10} color={C.muted} />
                    <Text style={s.meta}>{r.time}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  greeting: { fontSize: 20, fontWeight: '900', color: C.dark },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  profileBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.accent + '08',
    borderWidth: 1.5, borderColor: C.accent + '25',
    borderRadius: 18, padding: 14,
  },
  aiIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  aiTitle: { fontSize: 14, fontWeight: '800', color: C.dark, marginBottom: 2 },
  aiSub: { fontSize: 11, color: C.muted },
  statsBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 16, paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: C.dark },
  statLbl: { fontSize: 10, color: C.muted, marginTop: 1 },
  statDivider: { width: 1, backgroundColor: C.border },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: C.dark, letterSpacing: 1 },
  sectionLink: { fontSize: 11, color: C.accent, fontWeight: '700' },
  offerCard: { width: 148, borderWidth: 1.5, borderRadius: 16, padding: 12, position: 'relative' },
  offerBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  offerBadgeText: { fontSize: 10, color: '#fff', fontWeight: '900' },
  offerIconWrap: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  offerTitle: { fontSize: 12, fontWeight: '800', marginBottom: 3 },
  offerDesc: { fontSize: 10, color: C.muted, lineHeight: 14, marginBottom: 6 },
  offerRest: { fontSize: 10, color: C.dark, fontWeight: '700', marginBottom: 2 },
  offerExpires: { fontSize: 9, color: C.muted },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 999,
  },
  catChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  catText: { fontSize: 11, fontWeight: '600', color: C.dark },
  featCard: {
    width: 140, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: C.border, borderRadius: 18, padding: 12,
  },
  featImage: { width: '100%', height: 80, borderRadius: 12, marginBottom: 8 },
  featBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  featBadgeText: { fontSize: 9, fontWeight: '800' },
  featName: { fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 2 },
  featType: { fontSize: 10, color: C.muted, marginBottom: 6 },
  featMeta: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  featMetaText: { fontSize: 10, color: C.muted },
  featOpen: { fontSize: 10, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 13,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 16, marginBottom: 8,
  },
  cardImage: { width: 52, height: 52, borderRadius: 15, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.dark, flex: 1, marginRight: 8 },
  cardSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 10, color: C.muted },
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  tagText: { fontSize: 9, fontWeight: '800' },
});
