// ═══════════════════════════════════════════════════
//  app/(tabs)/map.tsx
// ═══════════════════════════════════════════════════

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  // Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { getRestaurants, Restaurant } from '../../services/restaurants';
import { getRoute } from '../../services/routes';
// import { getRestaurantImage } from '../../utils/restaurantImages';
import { getRestaurantImageSource } from '../../utils/restaurantImages';
import {
  formatDistanceFromMeters,
  formatDurationFromSeconds,
  parseDistanceToMeters,
} from '../../utils/format';
import { Image } from 'expo-image';

const { height: SH } = Dimensions.get('window');
const MAP_H = SH * 0.55;

const FALLBACK_COORDS: [number, number] = [51.1801, 71.4460];

const C = {
  bg: '#FDF8F2',
  dark: '#1A1208',
  accent: '#E8420A',
  muted: '#8C7B6B',
  border: '#EDE5D8',
  green: '#2E7D32',
  red: '#D32F2F',
};

const FILTERS = ['Все', 'Открыто', 'Рядом', 'Топ'];

function getParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildMapHTML(
  restaurants: Restaurant[],
  selectedId: number | null,
  routeCoords: [number, number][] | null,
  travelMode: string,
  userCoords: [number, number],
): string {
  const markersJS = restaurants
    .map(r => {
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return '';
      const isSelected = r.id === selectedId;
      const size = isSelected ? 50 : 38;
      const border = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.6)';
      const shadow = isSelected
        ? 'box-shadow:0 4px 16px rgba(0,0,0,0.35);'
        : 'box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      const zIndex = isSelected ? 1000 : 100;

      return `
        var icon_${r.id} = L.divIcon({
          className: '',
          html: '<div style="width:${size}px;height:${size}px;border-radius:50%;background:${r.color};display:flex;align-items:center;justify-content:center;border:${border};${shadow}"><svg width="${isSelected ? 22 : 16}" height="${isSelected ? 22 : 16}" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
          iconSize: [${size}, ${size}],
          iconAnchor: [${size / 2}, ${size / 2}],
        });
        L.marker([${r.lat}, ${r.lng}], {icon: icon_${r.id}, zIndexOffset: ${zIndex}})
          .addTo(map)
          .on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            window.ReactNativeWebView.postMessage(JSON.stringify({type:'select', id:${r.id}}));
          });
      `;
    })
    .join('\n');

  const routeJS =
    routeCoords && routeCoords.length > 0
      ? `
    if (window._route) { map.removeLayer(window._route); }
    window._route = L.polyline(${JSON.stringify(routeCoords)}, {
      color: '${travelMode === 'foot-walking' ? C.accent : '#1565C0'}',
      weight: 5, opacity: 0.85,
      dashArray: ${travelMode === 'foot-walking' ? "'8, 6'" : 'null'},
      lineCap: 'round', lineJoin: 'round',
    }).addTo(map);
    map.fitBounds(window._route.getBounds(), {padding: [60, 60]});
  `
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none; }
    .leaflet-control-zoom { border: none !important; margin-right: 10px !important; margin-bottom: 10px !important; }
    .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; border-radius: 10px !important; font-size: 18px !important; color: #1A1208 !important; border: 1.5px solid #EDE5D8 !important; background: rgba(253,248,242,0.96) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { center: [${userCoords[0]}, ${userCoords[1]}], zoom: 13, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map);

    var userIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#2196F3;border:3px solid rgba(33,150,243,0.4);box-shadow:0 0 0 6px rgba(33,150,243,0.15)"></div>',
      iconSize: [16, 16], iconAnchor: [8, 8],
    });

    L.marker([${userCoords[0]}, ${userCoords[1]}], {icon: userIcon, zIndexOffset: 500}).addTo(map);

    ${markersJS}
    ${routeJS}

    map.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'deselect'}));
    });
  </script>
</body>
</html>`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ restaurantId?: string; buildRoute?: string }>();
  const webViewRef = useRef<any>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Все');
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [travelMode, setTravelMode] = useState<'foot-walking' | 'driving-car'>('foot-walking');
  const [routeInfo, setRouteInfo] = useState<{ dist: string; time: string } | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number]>(FALLBACK_COORDS);
  const [locationReady, setLocationReady] = useState(false);

  // useEffect(() => {
  //   const loadInitialData = async () => {
  //     try {
  //       setLoading(true);

  //       const [restaurantsData] = await Promise.all([
  //         getRestaurants(),
  //       ]);

  //       setRestaurants(restaurantsData);

  //       try {
  //         const permission = await Location.requestForegroundPermissionsAsync();

  //         if (permission.status === 'granted') {
  //           const location = await Location.getCurrentPositionAsync({
  //             accuracy: Location.Accuracy.Balanced,
  //           });

  //           setUserCoords([location.coords.latitude, location.coords.longitude]);
  //         }
  //       } catch (locationErr) {
  //         console.error('Failed to get user location:', locationErr);
  //       } finally {
  //         setLocationReady(true);
  //       }
  //     } catch (err) {
  //       console.error('Failed to load restaurants for map:', err);
  //       setError('Не удалось загрузить карту');
  //       setLocationReady(true);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadInitialData();
  // }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        let coords: [number, number] = FALLBACK_COORDS;
        let lat: number | undefined;
        let lng: number | undefined;

        try {
          const permission = await Location.requestForegroundPermissionsAsync();

          if (permission.status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            coords = [location.coords.latitude, location.coords.longitude];
            lat = location.coords.latitude;
            lng = location.coords.longitude;
          }
        } catch (locationErr) {
          console.error('Failed to get user location:', locationErr);
        }

        setUserCoords(coords);

        const restaurantsData = await getRestaurants(lat, lng);
        setRestaurants(restaurantsData);

        setLocationReady(true);
      } catch (err) {
        console.error('Failed to load restaurants for map:', err);
        setError('Не удалось загрузить карту');
        setLocationReady(true);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const filtered = restaurants.filter(r => {
    if (activeFilter === 'Открыто') return r.open;
    // if (activeFilter === 'Рядом') return parseInt(r.dist) < 700;
    if (activeFilter === 'Рядом') return parseDistanceToMeters(r.dist) < 700;
    if (activeFilter === 'Топ') return r.rating >= 4.7;
    return true;
  });

  const routeRestaurantVisible = !!selected && (routeCoords !== null || routeLoading);
  const mapRestaurants = routeRestaurantVisible ? [selected] : filtered;

  const mapHTML = buildMapHTML(
    mapRestaurants,
    selected?.id ?? null,
    routeCoords,
    travelMode,
    userCoords,
  );

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'select') {
        const found = restaurants.find(r => r.id === data.id);
        if (found) {
          setSelected(found);
          setRouteCoords(null);
          setRouteInfo(null);
          buildRoute(found, travelMode);
        }
      } else if (data.type === 'deselect') {
        setSelected(null);
        setRouteCoords(null);
        setRouteInfo(null);
      }
    } catch {}
  };

  const buildRoute = useCallback(async (dest: Restaurant, mode: string) => {
    if (typeof dest.lat !== 'number' || typeof dest.lng !== 'number') return;

    setRouteLoading(true);

    try {
      const data = await getRoute(
        userCoords[0],
        userCoords[1],
        dest.lat,
        dest.lng,
        mode,
      );

      const coords: [number, number][] = data.geometry.map(
        (point: number[]) => [point[1], point[0]],
      );

      // const distM = Math.round(data.distance ?? 0);
      // const timeMin = Math.round((data.duration ?? 0) / 60);
      // const distStr = distM >= 1000 ? `${(distM / 1000).toFixed(1)} км` : `${distM} м`;

      // setRouteCoords(coords);
      // setRouteInfo({ dist: distStr, time: `${timeMin} мин` });

      const distM = Math.round(data.distance ?? 0);
      const durationSeconds = Math.round(data.duration ?? 0);

      const distStr = formatDistanceFromMeters(distM);
      const timeStr = formatDurationFromSeconds(durationSeconds);

      setRouteCoords(coords);
      setRouteInfo({ dist: distStr, time: timeStr });
    } catch (err) {
      console.error('Route error:', err);
      setRouteCoords(null);
      setRouteInfo(null);
    } finally {
      setRouteLoading(false);
    }
  }, [userCoords]);

  useEffect(() => {
    const routeRestaurantIdParam = getParamValue(params.restaurantId);
    const shouldBuildRoute = getParamValue(params.buildRoute) === '1';
    const routeRestaurantId = Number(routeRestaurantIdParam);

    if (
      !shouldBuildRoute ||
      !Number.isFinite(routeRestaurantId) ||
      !locationReady ||
      restaurants.length === 0
    ) {
      return;
    }

    const found = restaurants.find(item => item.id === routeRestaurantId);
    if (!found) return;

    setActiveFilter('Все');
    setSelected(found);
    setRouteCoords(null);
    setRouteInfo(null);
    buildRoute(found, travelMode);
    router.setParams({ restaurantId: undefined, buildRoute: undefined } as any);
  }, [
    buildRoute,
    locationReady,
    params.buildRoute,
    params.restaurantId,
    restaurants,
    travelMode,
  ]);

  const switchMode = (mode: 'foot-walking' | 'driving-car') => {
    setTravelMode(mode);
    if (selected) buildRoute(selected, mode);
  };

  if (loading || !locationReady) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: C.dark, fontWeight: '700' }}>Загрузка карты...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
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

      <View style={[s.topBar, { top: insets.top + 12 }]}>
        <TouchableOpacity style={s.searchBar} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="search-outline" size={15} color={C.muted} />
          <Text style={s.searchPlaceholder}>Найти место...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.aiPill} onPress={() => router.push('/(tabs)/ai')}>
          <MaterialCommunityIcons name="star-four-points" size={12} color="#fff" />
          <Text style={s.aiPillText}>AI</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.filtersRow, { top: insets.top + 64 }]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => {
              setActiveFilter(f);
              setSelected(null);
              setRouteCoords(null);
              setRouteInfo(null);
            }}
            style={[s.filterChip, activeFilter === f && s.filterChipActive]}
          >
            <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <WebView
        ref={webViewRef}
        style={{ height: MAP_H, width: '100%' }}
        source={{ html: mapHTML }}
        onMessage={handleMessage}
        scrollEnabled={false}
        javaScriptEnabled={true}
        originWhitelist={['*']}
      />

      <View style={s.counter}>
        <Ionicons name="location" size={11} color={C.muted} />
        <Text style={s.counterText}>{mapRestaurants.length} мест</Text>
      </View>

      <View style={s.bottomSheet}>
        <View style={s.handle} />

        {selected ? (
          <View>
            <View style={s.routeBar}>
              <TouchableOpacity
                style={[s.modeBtn, travelMode === 'foot-walking' && s.modeBtnActive]}
                onPress={() => switchMode('foot-walking')}
              >
                <Ionicons
                  name="walk-outline"
                  size={13}
                  color={travelMode === 'foot-walking' ? C.accent : C.dark}
                />
                <Text style={[s.modeBtnText, travelMode === 'foot-walking' && { color: C.accent }]}>
                  Пешком
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modeBtn, travelMode === 'driving-car' && s.modeBtnActive]}
                onPress={() => switchMode('driving-car')}
              >
                <Ionicons
                  name="car-outline"
                  size={13}
                  color={travelMode === 'driving-car' ? C.accent : C.dark}
                />
                <Text style={[s.modeBtnText, travelMode === 'driving-car' && { color: C.accent }]}>
                  На авто
                </Text>
              </TouchableOpacity>

              {routeLoading && (
                <Ionicons name="time-outline" size={14} color={C.muted} style={{ marginLeft: 8 }} />
              )}

              {routeInfo && !routeLoading && (
                <View style={s.routeInfo}>
                  <Text style={s.routeInfoText}>{routeInfo.dist} · {routeInfo.time}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={s.selectedCard}
              onPress={() => router.push({ pathname: '/detail', params: { id: selected.id } })}
              activeOpacity={0.9}
            >
              {/* <Image source={getRestaurantImage(selected.id)} style={s.selectedImage} /> */}
              <Image
                source={getRestaurantImageSource(selected)}
                style={s.selectedImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.selectedName}>{selected.name}</Text>
                  <View
                    style={[
                      s.tag,
                      { backgroundColor: selected.color + '18', borderColor: selected.color + '35' },
                    ]}
                  >
                    <Text style={[s.tagText, { color: selected.color }]}>{selected.tag}</Text>
                  </View>
                </View>
                <Text style={s.selectedSub}>
                  {selected.type} · {selected.price}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={10} color="#F5A623" />
                    <Text style={s.selectedMeta}>{selected.rating}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="location-outline" size={10} color={C.muted} />
                    <Text style={s.selectedMeta}>{selected.dist}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="time-outline" size={10} color={C.muted} />
                    <Text style={s.selectedMeta}>{selected.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: selected.open ? C.green : C.red,
                      }}
                    />
                    <Text
                      style={[
                        s.selectedMeta,
                        { color: selected.open ? C.green : C.red, fontWeight: '600' },
                      ]}
                    >
                      {selected.open ? 'Открыто' : 'Закрыто'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[s.goBtn, { backgroundColor: selected.color }]}>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.sheetTitle}>РЯДОМ С ВАМИ · {filtered.length} мест</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sheetRow}>
              {filtered.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={s.miniCard}
                  onPress={() => {
                    setSelected(r);
                    setRouteCoords(null);
                    setRouteInfo(null);
                    buildRoute(r, travelMode);
                  }}
                  activeOpacity={0.8}
                >
                  {/* <Image source={getRestaurantImage(r.id)} style={s.miniImage} /> */}
                  <Image
                    source={getRestaurantImageSource(r)}
                    style={s.miniImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                  <Text style={s.miniName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={s.miniDist}>{r.dist}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name="star" size={9} color={r.color} />
                    <Text style={[s.miniRating, { color: r.color }]}>{r.rating}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', gap: 10, zIndex: 10,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(253,248,242,0.96)',
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  searchPlaceholder: { fontSize: 13, color: C.muted },
  aiPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accent, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  aiPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  filtersRow: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', gap: 8, zIndex: 10,
  },
  filterChip: {
    backgroundColor: 'rgba(253,248,242,0.96)',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterText: { fontSize: 11, color: C.dark, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  counter: {
    position: 'absolute', top: MAP_H - 42, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(253,248,242,0.95)',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, zIndex: 5,
  },
  counterText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  bottomSheet: {
    backgroundColor: 'rgba(253,248,242,0.98)',
    borderTopWidth: 1, borderTopColor: C.border,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingBottom: 20,
  },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1, paddingHorizontal: 20, marginBottom: 10 },
  sheetRow: { paddingHorizontal: 20, gap: 10 },
  miniCard: { width: 88, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 10, alignItems: 'center', alignSelf: 'flex-start' },
  miniImage: { width: 42, height: 42, borderRadius: 13, marginBottom: 5 },
  miniName: { fontSize: 10, fontWeight: '700', color: C.dark, textAlign: 'center', lineHeight: 13, marginBottom: 2 },
  miniDist: { fontSize: 9, color: C.muted },
  miniRating: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  routeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: C.border, borderRadius: 20, backgroundColor: '#fff' },
  modeBtnActive: { backgroundColor: C.accent + '12', borderColor: C.accent },
  modeBtnText: { fontSize: 11, color: C.dark, fontWeight: '600' },
  routeInfo: { marginLeft: 'auto' as any, backgroundColor: C.accent + '12', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  routeInfoText: { fontSize: 11, color: C.accent, fontWeight: '700' },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, padding: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 18 },
  selectedImage: { width: 54, height: 54, borderRadius: 16 },
  selectedName: { fontSize: 15, fontWeight: '800', color: C.dark, marginBottom: 2 },
  selectedSub: { fontSize: 11, color: C.muted },
  selectedMeta: { fontSize: 10, color: C.muted },
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 9, fontWeight: '800' },
  goBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
