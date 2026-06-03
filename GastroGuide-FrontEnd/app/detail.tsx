import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { addFavorite, getFavorites, removeFavorite } from '../services/favorites';
import { getRestaurantOffers, Offer } from '../services/offers';
import { getRestaurantById, Restaurant, MenuItem } from '../services/restaurants';
import {
  createReview,
  getReviewsByRestaurant,
  Review,
  updateReview,
} from '../services/reviews';
import { getProfileMe } from '../services/profile';
// import { getRestaurantImage } from '../utils/restaurantImages';
import { getRestaurantImageSources } from '../utils/restaurantImages';
import { AppThemeColors, useAppTheme } from '@/lib/theme';

function StarRow({ rating, borderColor }: { rating: number; borderColor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name="star" size={10} color={i <= rating ? '#F5A623' : borderColor} />
      ))}
    </View>
  );
}

function formatReviewDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DetailScreen() {
  const { colors: C, isDark } = useAppTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const { id } = useLocalSearchParams();
  const restaurantId = Number(id);
  const { width: screenWidth } = useWindowDimensions();

  const [r, setRestaurant] = useState<Restaurant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'info' | 'reviews'>('menu');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewLoading, setReviewLoading] = useState(false);

  const saveAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({
    inputRange: [-80, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, -24],
    extrapolate: 'clamp',
  });
  const insets = useSafeAreaInsets();

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authenticated = await authService.isAuthenticated();
      setIsGuest(!authenticated);

      // const [restaurantData, offersData, reviewsData] = await Promise.all([
      //   getRestaurantById(restaurantId),
      //   getRestaurantOffers(restaurantId),
      //   getReviewsByRestaurant(restaurantId),
      // ]);

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
        }
      } catch (locationErr) {
        console.error('Failed to get detail location:', locationErr);
      }

      const [restaurantData, offersData, reviewsData] = await Promise.all([
        getRestaurantById(restaurantId, lat, lng),
        getRestaurantOffers(restaurantId),
        getReviewsByRestaurant(restaurantId),
      ]);

      setRestaurant(restaurantData);
      setOffers(offersData);
      setReviews(reviewsData);

      // if (authenticated) {
      //   const [favorites, me] = await Promise.all([
      //     getFavorites(),
      //     getProfileMe(),
      //   ]);

      //   const isFavorite = favorites.some(item => item.id === restaurantId);
      //   setSaved(isFavorite);
      //   setCurrentUserId(me.id);

      //   const myReview = reviewsData.find(item => item.user_id === me.id);
      //   if (myReview) {
      //     setReviewText(myReview.text);
      //     setReviewRating(myReview.rating);
      //   } else {
      //     setReviewText('');
      //     setReviewRating(5);
      //   }
      // } else {
      //   setSaved(false);
      //   setCurrentUserId(null);
      //   setReviewText('');
      //   setReviewRating(5);
      // }

      if (authenticated) {
        try {
          const [favorites, me] = await Promise.all([
            getFavorites(),
            getProfileMe(),
          ]);

          const isFavorite = favorites.some(item => item.id === restaurantId);
          setSaved(isFavorite);
          setCurrentUserId(me.id);

          const myReview = reviewsData.find(item => item.user_id === me.id);
          if (myReview) {
            setReviewText(myReview.text);
            setReviewRating(myReview.rating);
          } else {
            setReviewText('');
            setReviewRating(5);
          }
        } catch (authErr) {
          console.error('Failed to load auth-only detail data:', authErr);

          await authService.logout();

          setIsGuest(true);
          setSaved(false);
          setCurrentUserId(null);
          setReviewText('');
          setReviewRating(5);
        }
      } else {
        setSaved(false);
        setCurrentUserId(null);
        setReviewText('');
        setReviewRating(5);
      }
    } catch (err) {
      console.error('Failed to load restaurant detail:', err);
      setError('Не удалось загрузить ресторан');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!Number.isNaN(restaurantId)) {
      loadDetail();
    } else {
      setError('Некорректный id ресторана');
      setLoading(false);
    }
  }, [restaurantId, loadDetail]);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isNaN(restaurantId)) {
        loadDetail();
      }
    }, [restaurantId, loadDetail])
  );

  const offer = offers.length > 0 ? offers[0] : undefined;

  useEffect(() => {
    if (saved) {
      Animated.sequence([
        Animated.timing(saveAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(saveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
    }
  }, [saved, saveAnim]);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [r?.id]);

  const handleToggleFavorite = async () => {
    if (isGuest) {
      Alert.alert(
        'Требуется авторизация',
        'Войдите в аккаунт, чтобы сохранять заведения в избранное.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Войти', onPress: () => router.push('/onboarding') },
        ]
      );
      return;
    }

    if (favoriteLoading) return;

    try {
      setFavoriteLoading(true);

      if (saved) {
        await removeFavorite(restaurantId);
        setSaved(false);
      } else {
        await addFavorite(restaurantId);
        setSaved(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      Alert.alert('Ошибка', 'Не удалось обновить избранное');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (isGuest) {
      Alert.alert(
        'Требуется авторизация',
        'Войдите в аккаунт, чтобы оставить отзыв.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Войти', onPress: () => router.push('/onboarding') },
        ]
      );
      return;
    }

    if (!reviewText.trim()) {
      Alert.alert('Ошибка', 'Введите текст отзыва');
      return;
    }

    try {
      setReviewLoading(true);

      if (myReview) {
        await updateReview(restaurantId, {
          rating: reviewRating,
          text: reviewText.trim(),
        });
      } else {
        await createReview(restaurantId, {
          rating: reviewRating,
          text: reviewText.trim(),
        });
      }

      await loadDetail();
      Alert.alert('Готово', myReview ? 'Отзыв обновлён' : 'Отзыв добавлен');
    } catch (err) {
      console.error('Failed to submit review:', err);
      Alert.alert('Ошибка', 'Не удалось сохранить отзыв');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: C.dark, fontWeight: '700' }}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 16, color: C.red, fontWeight: '700', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!r) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="restaurant-outline" size={52} color={C.border} />
          <Text style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>Ресторан не найден</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>← Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCall = () => Linking.openURL(`tel:${r.phone}`);

  const handleRoute = () =>
    router.push({
      pathname: '/(tabs)/map',
      params: { restaurantId: String(r.id), buildRoute: '1' },
    });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${r.name} — ${r.type}\n★ ${r.rating} · ${r.dist}\n${r.address}\n\nНайдено в GastroGuide`,
      });
    } catch {}
  };

  const stats = [
    {
      icon: <Ionicons name="star" size={16} color="#F5A623" />,
      value: String(r.rating),
      label: 'Рейтинг',
    },
    {
      icon: <Ionicons name="chatbubble-outline" size={16} color={C.accent} />,
      value: String(r.reviews),
      label: 'Отзывов',
    },
    {
      icon: <Ionicons name="location-outline" size={16} color={C.accent} />,
      value: r.dist,
      label: 'Расстояние',
    },
    {
      icon: <Ionicons name="time-outline" size={16} color={C.accent} />,
      value: r.time,
      label: 'Пешком',
    },
  ];

  const TABS = [
    { key: 'menu', label: 'Меню', icon: 'restaurant-outline' as const },
    { key: 'info', label: 'Инфо', icon: 'information-circle-outline' as const },
    { key: 'reviews', label: 'Отзывы', icon: 'chatbubbles-outline' as const },
  ];

  const myReview = currentUserId
    ? reviews.find(item => item.user_id === currentUserId)
    : null;
  const photoSources = getRestaurantImageSources(r);
  const hasMultiplePhotos = photoSources.length > 1;

  const handlePhotoMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setActivePhotoIndex(Math.min(nextIndex, photoSources.length - 1));
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? C.bg : `${r.color}18`} />

      <Animated.View style={[s.hero, { backgroundColor: r.color + '18' }]}>
        <Animated.ScrollView
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePhotoMomentumEnd}
          scrollEventThrottle={16}
          style={[
            s.heroCarousel,
            {
              transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
            },
          ]}
        >
          {photoSources.map((source, index) => (
            <Animated.Image
              key={`${r.id}-${index}`}
              source={source}
              style={[s.heroImage, { width: screenWidth }]}
              resizeMode="cover"
            />
          ))}
        </Animated.ScrollView>
        <View pointerEvents="none" style={s.heroOverlay} />

        {hasMultiplePhotos && (
          <View pointerEvents="none" style={s.photoDots}>
            {photoSources.map((_, index) => (
              <View
                key={`${r.id}-dot-${index}`}
                style={[
                  s.photoDot,
                  index === activePhotoIndex && s.photoDotActive,
                ]}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={[s.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={C.dark} />
        </TouchableOpacity>

        <Animated.View
          style={[s.saveBtn, { top: insets.top + 12, transform: [{ scale: saveAnim }] }]}
        >
          <TouchableOpacity onPress={handleToggleFavorite} disabled={favoriteLoading}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={saved ? C.red : C.dark}
            />
          </TouchableOpacity>
        </Animated.View>

        <View style={[s.openBadge, { backgroundColor: r.open ? C.green : C.red }]}>
          <Text style={s.openBadgeText}>{r.open ? 'Открыто' : 'Закрыто'}</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{r.name}</Text>
            <Text style={s.sub}>
              {r.type} · {r.price}
            </Text>
          </View>
          <View style={[s.badge, { borderColor: r.color + '50', backgroundColor: r.color + '12' }]}>
            <Text style={[s.badgeText, { color: r.color }]}>{r.tag}</Text>
          </View>
        </View>

        {offer && (
          <View
            style={[
              s.offerBanner,
              { borderColor: offer.color + '40', backgroundColor: offer.color + '08' },
            ]}
          >
            <Ionicons name="pricetag" size={18} color={offer.color} />
            <View style={{ flex: 1 }}>
              <Text style={[s.offerTitle, { color: offer.color }]}>{offer.title}</Text>
              <Text style={s.offerDesc}>{offer.description}</Text>
            </View>
            {offer.discount ? (
              <View style={[s.offerBadge, { backgroundColor: offer.color }]}>
                <Text style={s.offerBadgeText}>{offer.discount}</Text>
              </View>
            ) : null}
          </View>
        )}

        {r.description && <Text style={s.description}>{r.description}</Text>}

        {r.features && r.features.length > 0 && (
          <View style={s.featuresRow}>
            {r.features.map((f: string) => (
              <View key={f} style={s.featureChip}>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.statsRow}>
          {stats.map(st => (
            <View key={st.label} style={s.statCard}>
              {st.icon}
              {/* <Text style={s.statValue}>{st.value}</Text> */}
              <Text
                style={[
                  s.statValue,
                  st.label === 'Пешком' && s.statValueTime,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
                ellipsizeMode="clip"
              >
                {st.value}
              </Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.tabsRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, activeTab === t.key && s.tabActive]}
              onPress={() => setActiveTab(t.key as 'menu' | 'info' | 'reviews')}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={activeTab === t.key ? C.accent : C.muted}
              />
              <Text style={[s.tabText, activeTab === t.key && { color: C.accent, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'menu' && r.menu && (
          <View style={s.menuCard}>
            {r.menu.map((item: MenuItem, i: number) => (
              // <View key={item.name} style={[s.menuItem, i < r.menu.length - 1 && s.menuItemBorder]}>
              <View key={item.id} style={[s.menuItem, i < r.menu.length - 1 && s.menuItemBorder]}>
                {/* <View style={[s.menuIcon, { backgroundColor: r.color + '15' }]}>
                  <Ionicons name="fast-food-outline" size={18} color={r.color} />
                </View> */}

                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={s.menuItemImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={120}
                  />
                ) : (
                  <View style={[s.menuIcon, { backgroundColor: r.color + '15' }]}>
                    <Ionicons name="fast-food-outline" size={18} color={r.color} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.menuName}>{item.name}</Text>
                    {item.popular && (
                      <View style={s.popularBadge}>
                        <Ionicons name="flame" size={8} color="#E65100" />
                        <Text style={s.popularText}>ХИТ</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[s.menuPrice, { color: r.color }]}>{item.price}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'info' && (
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="location" size={16} color={C.accent} />
              </View>
              <Text style={s.infoText}>{r.address}</Text>
            </View>
            <View style={s.divider} />
            <TouchableOpacity style={s.infoRow} onPress={handleCall}>
              <View style={s.infoIconWrap}>
                <Ionicons name="call" size={16} color={C.accent} />
              </View>
              <Text style={[s.infoText, { color: C.accent }]}>{r.phone}</Text>
            </TouchableOpacity>
            <View style={s.divider} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="time" size={16} color={C.accent} />
              </View>
              <Text style={s.infoText}>Режим работы: {r.hours}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Ionicons name="cash" size={16} color={C.accent} />
              </View>
              <Text style={s.infoText}>Ценовой диапазон: {r.price}</Text>
            </View>
          </View>
        )}

        {activeTab === 'reviews' && (
          <View>
            <View style={s.ratingBox}>
              <Text style={s.bigRating}>{r.rating}</Text>
              <View>
                <StarRow rating={Math.round(r.rating)} borderColor={C.border} />
                <Text style={s.reviewCount}>{r.reviews} отзывов</Text>
              </View>
            </View>

            {!isGuest && (
              <View style={s.reviewForm}>
                <Text style={s.reviewFormTitle}>
                  {myReview ? 'Ваш отзыв' : 'Оставить отзыв'}
                </Text>

                <View style={s.ratingPicker}>
                  {[1, 2, 3, 4, 5].map(value => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setReviewRating(value)}
                      style={s.ratingBtn}
                    >
                      <Ionicons
                        name={value <= reviewRating ? 'star' : 'star-outline'}
                        size={22}
                        color="#F5A623"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={s.reviewInput}
                  placeholder="Напишите ваш отзыв..."
                  placeholderTextColor={C.muted}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[s.reviewActionBtn, { backgroundColor: C.accent, flex: 1 }]}
                    onPress={handleSubmitReview}
                    disabled={reviewLoading}
                  >
                    <Text style={s.reviewActionText}>
                      {reviewLoading
                        ? 'Сохранение...'
                        : myReview
                        ? 'Обновить отзыв'
                        : 'Оставить отзыв'}
                    </Text>
                  </TouchableOpacity>

                  {/* {myReview && (
                    <TouchableOpacity
                      style={[s.reviewActionBtn, s.reviewDeleteBtn]}
                      onPress={handleDeleteReview}
                      disabled={reviewLoading}
                    >
                      <Text style={[s.reviewActionText, { color: C.red }]}>Удалить</Text>
                    </TouchableOpacity>
                  )} */}
                </View>
              </View>
            )}

            {isGuest && (
              <View style={s.reviewCard}>
                <Text style={s.reviewText}>
                  Войдите в аккаунт, чтобы оставить отзыв
                </Text>
              </View>
            )}

            {reviews.length === 0 ? (
              <View style={s.reviewCard}>
                <Text style={s.reviewText}>Пока нет отзывов</Text>
              </View>
            ) : (
              reviews.map((rev, i) => (
                <View
                  key={rev.id}
                  style={[s.reviewCard, i < reviews.length - 1 && { marginBottom: 8 }]}
                >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}
                  >
                    <View style={s.reviewAvatar}>
                      <Ionicons name="person" size={16} color={C.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reviewName}>
                        {rev.author_name || 'Пользователь'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <StarRow rating={rev.rating} borderColor={C.border} />
                        <Text style={s.reviewDate}>{formatReviewDate(rev.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={s.reviewText}>{rev.text}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <TouchableOpacity style={s.aiCard} onPress={() => router.push('/(tabs)/ai')} activeOpacity={0.85}>
          <View style={s.aiIconWrap}>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiTitle}>Спросить AI ассистента</Text>
            <Text style={s.aiSub}>Что заказать или найти альтернативы</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={C.accent} />
        </TouchableOpacity>
      </Animated.ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.btnPrimary, { backgroundColor: r.color }]} onPress={handleRoute}>
          <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.btnPrimaryText}>Маршрут</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnIcon} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={C.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={s.btnIcon} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={C.dark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (C: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#EDE5D8',
  },
  heroCarousel: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 18, 8, 0.12)',
  },
  photoDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  photoDotActive: {
    width: 18,
    backgroundColor: C.card,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBadge: { position: 'absolute', bottom: 14, right: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  openBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  content: { padding: 20, paddingBottom: 100 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  name: { fontSize: 24, fontWeight: '900', color: C.dark },
  sub: { fontSize: 12, color: C.muted, marginTop: 3 },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  offerBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 14 },
  offerTitle: { fontSize: 12, fontWeight: '800', marginBottom: 1 },
  offerDesc: { fontSize: 11, color: C.muted },
  offerBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  offerBadgeText: { fontSize: 11, color: '#fff', fontWeight: '900' },
  description: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 14 },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  featureChip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  featureText: { fontSize: 10, color: C.dark, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  // statCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 10, alignItems: 'center', gap: 3 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 5,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  statValue: { fontSize: 14, fontWeight: '900', color: C.dark },

  statValueTime: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },

  statLabel: { fontSize: 9, color: C.muted, marginTop: 1 },
  tabsRow: { flexDirection: 'row', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, marginBottom: 14, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10 },
  tabActive: { backgroundColor: C.accent + '12' },
  tabText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  infoCard: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  infoIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.accent + '10', alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: 13, color: C.dark, flex: 1 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },
  menuCard: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, gap: 10 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  menuItemImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.border,
  },

  menuName: { fontSize: 13, fontWeight: '600', color: C.dark },
  menuPrice: { fontSize: 13, fontWeight: '800' },
  popularBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FFF3E0', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  popularText: { fontSize: 8, fontWeight: '800', color: '#E65100' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  bigRating: { fontSize: 40, fontWeight: '900', color: C.dark },
  reviewCount: { fontSize: 10, color: C.muted, marginTop: 2 },
  reviewCard: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 2 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  reviewName: { fontSize: 13, fontWeight: '700', color: C.dark },
  reviewDate: { fontSize: 9, color: C.muted },
  reviewText: { fontSize: 12, color: C.muted, lineHeight: 18 },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: C.accent + '08', borderWidth: 1.5, borderColor: C.accent + '25', borderRadius: 16, padding: 14 },
  aiIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 2 },
  aiSub: { fontSize: 11, color: C.muted },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28, backgroundColor: C.overlay, borderTopWidth: 1, borderTopColor: C.border },
  btnPrimary: { flex: 1, flexDirection: 'row', borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnIcon: { width: 50, height: 50, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backLink: { marginTop: 16, padding: 12 },

  reviewForm: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  reviewFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.dark,
    marginBottom: 10,
  },
  ratingPicker: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  ratingBtn: {
    padding: 4,
  },
  reviewInput: {
    minHeight: 90,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 13,
    color: C.dark,
    marginBottom: 12,
    backgroundColor: C.bg,
  },
  reviewActionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDeleteBtn: {
    backgroundColor: C.red + '10',
    borderWidth: 1.5,
    borderColor: C.red + '30',
  },
  reviewActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
