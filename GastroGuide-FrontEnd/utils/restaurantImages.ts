import { ImageSourcePropType } from 'react-native';

const RESTAURANT_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('../assets/images/restaurants/hall.jpg'),
  2: require('../assets/images/restaurants/sushi.jpg'),
  3: require('../assets/images/restaurants/whall.jpg'),
  4: require('../assets/images/restaurants/steak.jpg'),
  5: require('../assets/images/restaurants/healthyfood.jpg'),
  6: require('../assets/images/restaurants/pasta.jpg'),
};

const FALLBACK_IMAGE = require('../assets/images/restaurants/food.jpg');

export function getRestaurantImage(restaurantId?: number | null): ImageSourcePropType {
  if (!restaurantId) {
    return FALLBACK_IMAGE;
  }

  return RESTAURANT_IMAGES[restaurantId] ?? FALLBACK_IMAGE;
}
