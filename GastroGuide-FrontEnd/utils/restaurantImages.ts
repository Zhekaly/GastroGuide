import type { ImageSourcePropType } from 'react-native';
import type { Restaurant } from '../services/restaurants';

export const FALLBACK_RESTAURANT_IMAGE_URL =
  'https://pub-09d1dddc17f54298b126b42fd99aff8d.r2.dev/restaurants/fallback.jpg';

export function getRestaurantImageUri(restaurant?: Restaurant | null): string {
  const firstPhoto = restaurant?.photos?.[0];

  if (typeof firstPhoto === 'string' && firstPhoto.startsWith('http')) {
    return firstPhoto;
  }

  return FALLBACK_RESTAURANT_IMAGE_URL;
}

export function getRestaurantImageUris(restaurant?: Restaurant | null): string[] {
  const photos = restaurant?.photos?.filter(
    (photo): photo is string => typeof photo === 'string' && photo.startsWith('http')
  );

  return photos && photos.length > 0 ? photos : [FALLBACK_RESTAURANT_IMAGE_URL];
}

export function getRestaurantImageSource(
  restaurant?: Restaurant | null
): ImageSourcePropType {
  return {
    uri: getRestaurantImageUri(restaurant),
  };
}

export function getRestaurantImageSources(
  restaurant?: Restaurant | null
): ImageSourcePropType[] {
  return getRestaurantImageUris(restaurant).map(uri => ({ uri }));
}
