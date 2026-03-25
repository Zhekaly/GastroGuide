import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView, StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getCategories, getRestaurants, searchRestaurants, Restaurant, Category } from '../../services/restaurants';
import * as Location from 'expo-location';
import { getRestaurantImage } from '../../utils/restaurantImages';


const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  'Все':         'restaurant-outline',
  'Казахская':   'leaf-outline',
  'Японская':    'fish-outline',
  'Итальянская': 'pizza-outline',
  'Фастфуд':     'fast-food-outline',
  'Кофейня':     'cafe-outline',
  'Бургеры':     'restaurant-outline',
  'Пицца':       'pizza-outline',
  'Суши':        'fish-outline',
  'Веган':       'leaf-outline',
};
function getCategoryIcon(label: string): React.ComponentProps<typeof Ionicons>['name'] {
  return CATEGORY_ICONS[label] ?? 'restaurant-outline';
}

const C = {
  bg: '#FDF8F2', dark: '#1A1208', accent: '#E8420A',
  muted: '#8C7B6B', border: '#EDE5D8', green: '#2E7D32', red: '#D32F2F',
};

const SORT_OPTIONS = ['По рейтингу', 'По расстоянию', 'По цене'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [sort, setSort] = useState('По рейтингу');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const allCategories = [
    { id: 0, label: 'Все', sort_order: 0 },
    ...categories,
  ];

  useEffect(() => {
    const loadInitialRestaurants = async () => {
      try {
        setLoading(true);

        let lat: number | undefined;
        let lng: number | undefined;

        try {
          const permission = await Location.requestForegroundPermissionsAsync();

          if (permission.status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            lat = location.coords.latitude;
            lng = location.coords.longitude;
            setUserCoords({ lat, lng });
          }
        } catch (locationErr) {
          console.error('Failed to get search location:', locationErr);
        }

        const [restaurantsData, categoriesData] = await Promise.all([
          getRestaurants(lat, lng),
          getCategories(),
        ]);

        setRestaurants(restaurantsData);
        setCategories(categoriesData);
        setError(null);
      } catch (err) {
        console.error('Failed to load restaurants:', err);
        setError('Не удалось загрузить рестораны');
      } finally {
        setLoading(false);
      }
    };

    loadInitialRestaurants();
  }, []);

  useEffect(() => {
    const runSearch = async () => {
      try {
        setLoading(true);

        const lat = userCoords?.lat;
        const lng = userCoords?.lng;

        if (query.trim().length === 0) {
          const data = await getRestaurants(lat, lng);
          setRestaurants(data);
        } else {
          const data = await searchRestaurants(query.trim(), lat, lng);
          setRestaurants(data);
        }

        setError(null);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Ошибка поиска');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      runSearch();
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, userCoords]);

  const filtered = useMemo(() => {
    return [...restaurants]
      .filter(r => {
        const matchCat =
          !activeCategory ||
          activeCategory === 0 ||
          r.category_id === activeCategory;

        const matchOpen = !onlyOpen || r.open;
        return matchCat && matchOpen;
      })
      .sort((a, b) => {
        if (sort === 'По рейтингу') return b.rating - a.rating;
        if (sort === 'По расстоянию') return parseInt(a.dist) - parseInt(b.dist);
        if (sort === 'По цене') return a.price.length - b.price.length;
        return 0;
      });
  }, [restaurants, activeCategory, onlyOpen, sort]);

  if (loading && restaurants.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: C.dark, fontWeight: '700' }}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 16, color: C.red, fontWeight: '700', textAlign: 'center' }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>Поиск</Text>

        <View style={s.searchBar}>
          <Feather name="search" size={15} color={C.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Ресторан, блюдо, кухня..."
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={allCategories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={s.catsRow}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={[s.catChip, activeCategory === c.id && s.catChipActive]}
              onPress={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
            >
              <Ionicons
                name={getCategoryIcon(c.label)}
                size={13}
                color={activeCategory === c.id ? '#fff' : C.muted}
              />
              <Text style={[s.catText, activeCategory === c.id && { color: '#fff' }]}>{c.label}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={s.sortRow}>
          <View style={s.sortChips}>
            {SORT_OPTIONS.map(o => (
              <TouchableOpacity
                key={o}
                style={[s.sortChip, sort === o && s.sortChipActive]}
                onPress={() => setSort(o)}
              >
                <Text style={[s.sortText, sort === o && s.sortTextActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[s.openToggle, onlyOpen && s.openToggleActive]}
            onPress={() => setOnlyOpen(!onlyOpen)}
          >
            {onlyOpen && <Ionicons name="checkmark" size={10} color="#fff" style={{ marginRight: 3 }} />}
            <Text style={[s.openToggleText, onlyOpen && { color: '#fff' }]}>Открыто</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={r => String(r.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Ionicons name="restaurant-outline" size={52} color={C.border} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>Ничего не найдено</Text>
            <Text style={s.emptySub}>Попробуйте другой запрос или уберите фильтры</Text>
          </View>
        )}
        ListHeaderComponent={filtered.length > 0 ? (
          <Text style={s.resultCount}>{filtered.length} заведений</Text>
        ) : null}
        renderItem={({ item: r }) => (
          <TouchableOpacity
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
                <Text style={{ color: r.open ? C.green : C.red, fontWeight: '600' }}>
                  {r.open ? 'Открыто' : 'Закрыто'}
                </Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                <View style={s.metaRow}>
                  <Ionicons name="star" size={10} color="#F5A623" />
                  <Text style={s.meta}>{r.rating}</Text>
                </View>
                <View style={s.metaRow}>
                  <Ionicons name="chatbubble-outline" size={10} color={C.muted} />
                  <Text style={s.meta}>{r.reviews}</Text>
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
              {query && r.menu?.some(m => m.name.toLowerCase().includes(query.toLowerCase())) && (
                <View style={s.menuMatch}>
                  <Ionicons name="restaurant-outline" size={10} color={C.accent} style={{ marginRight: 4 }} />
                  <Text style={s.menuMatchText}>
                    {r.menu
                      ?.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
                      .map(m => m.name)
                      .join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 22, fontWeight: '900', color: C.dark, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: C.dark },
  catsRow: { gap: 8, paddingRight: 8, marginBottom: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 999 },
  catChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  catText: { fontSize: 11, fontWeight: '600', color: C.dark },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sortChips: { flexDirection: 'row', gap: 6 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 20 },
  sortChipActive: { backgroundColor: C.dark, borderColor: C.dark },
  sortText: { fontSize: 10, color: C.muted, fontWeight: '600' },
  sortTextActive: { color: '#fff' },
  openToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.border, borderRadius: 20 },
  openToggleActive: { backgroundColor: C.green, borderColor: C.green },
  openToggleText: { fontSize: 10, color: C.muted, fontWeight: '600' },
  list: { padding: 20, gap: 8, paddingBottom: 100 },
  resultCount: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 13, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardImage: { width: 52, height: 52, borderRadius: 15, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.dark, flex: 1, marginRight: 8 },
  cardSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 10, color: C.muted },
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  tagText: { fontSize: 9, fontWeight: '800' },
  menuMatch: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: C.accent + '10', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  menuMatchText: { fontSize: 10, color: C.accent, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.dark, marginBottom: 6 },
  emptySub: { fontSize: 12, color: C.muted, textAlign: 'center' },
});
