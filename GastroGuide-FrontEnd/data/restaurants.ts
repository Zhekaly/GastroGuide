// ─── TYPES ──────────────────────────────────────────────────────────────────

export type MenuItem = {
  name: string;
  price: string;
  emoji: string;
  popular?: boolean;
};

export type Restaurant = {
  id: number;
  name: string;
  type: string;
  emoji: string;
  color: string;
  tag: string;
  rating: number;
  reviews: number;
  dist: string;
  time: string;
  price: string;
  open: boolean;
  address: string;
  phone: string;
  description: string;
  menu: MenuItem[];
  hours: string;
  lat: number;
  lng: number;
  features: string[];
  photos: string[];
  priceRange: number; // 1-4
};

export type Category = {
  id: number;
  emoji: string;
  label: string;
};

export type AIResponse = {
  keywords: string[];
  response: string;
};

// ─── CATEGORIES ─────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  { id: 1, emoji: '🇰🇿', label: 'Казахская' },
  { id: 2, emoji: '🍣', label: 'Японская' },
  { id: 3, emoji: '🍕', label: 'Итальянская' },
  { id: 4, emoji: '🥩', label: 'Гриль' },
  { id: 5, emoji: '🌿', label: 'Вегетарианская' },
  { id: 6, emoji: '☕', label: 'Кофейня' },
  { id: 7, emoji: '🍜', label: 'Азиатская' },
  { id: 8, emoji: '🥗', label: 'ЗОЖ' },
];

// ─── RESTAURANTS ────────────────────────────────────────────────────────────

export const RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: 'Nauryz Dastarkhan',
    type: 'Казахская кухня',
    emoji: '🏺',
    color: '#C0392B',
    tag: '🇰🇿 Традиции',
    rating: 4.8,
    reviews: 1247,
    dist: '350 м',
    time: '5 мин',
    price: '₸₸',
    open: true,
    address: 'ул. Сейфуллина, 12, Астана',
    phone: '+7 701 234 5678',
    description: 'Аутентичная казахская кухня в современном интерьере. Бешбармак по рецепту бабушки шеф-повара, свежий кумыс и горячие баурсаки. Живая домбра по вечерам.',
    hours: '10:00 – 23:00',
    lat: 51.180,
    lng: 71.446,
    features: ['🎵 Живая музыка', '🅿️ Парковка', '👨‍👩‍👧 Семейный', '🏮 Мангал'],
    photos: ['🍖', '🥣', '🫓'],
    priceRange: 2,
    menu: [
      { name: 'Бешбармак', price: '3 900 ₸', emoji: '🍖', popular: true },
      { name: 'Куырдак', price: '2 400 ₸', emoji: '🥘' },
      { name: 'Манты', price: '1 800 ₸', emoji: '🥟', popular: true },
      { name: 'Лагман', price: '1 600 ₸', emoji: '🍜' },
      { name: 'Баурсаки', price: '600 ₸', emoji: '🍩' },
    ],
  },
  {
    id: 2,
    name: 'Manga Sushi Bar',
    type: 'Японская кухня',
    emoji: '🍣',
    color: '#E91E63',
    tag: '🔥 Хит',
    rating: 4.7,
    reviews: 983,
    dist: '520 м',
    time: '7 мин',
    price: '₸₸₸',
    open: true,
    address: 'пр. Республики, 45, Астана',
    phone: '+7 702 345 6789',
    description: 'Модный суши-бар с японским шефом Тарасо Ямамото. Свежая рыба доставляется ежедневно. Открытая кухня, тeppanyaki-гриль и премиум сеты.',
    hours: '11:00 – 00:00',
    lat: 51.183,
    lng: 71.452,
    features: ['🎌 Японский шеф', '🍶 Сакэ', '💳 Доставка', '🪑 Тeppanyaki'],
    photos: ['🍣', '🦐', '🍱'],
    priceRange: 3,
    menu: [
      { name: 'Сет "Сакура" (32 шт)', price: '7 800 ₸', emoji: '🌸', popular: true },
      { name: 'Том Ям суп', price: '2 200 ₸', emoji: '🍲' },
      { name: 'Унаги дон', price: '3 400 ₸', emoji: '🍱', popular: true },
      { name: 'Эдамамэ', price: '900 ₸', emoji: '🫛' },
      { name: 'Маки Калифорния', price: '1 800 ₸', emoji: '🍣' },
    ],
  },
  {
    id: 3,
    name: 'Sakura Garden',
    type: 'Азиатская фьюжн',
    emoji: '🌸',
    color: '#9C27B0',
    tag: '⭐ Топ города',
    rating: 4.9,
    reviews: 2156,
    dist: '280 м',
    time: '4 мин',
    price: '₸₸₸₸',
    open: true,
    address: 'ул. Кунаева, 8, Астана',
    phone: '+7 703 456 7890',
    description: 'Лучший ресторан Астаны 2024 по версии Zagat. Паназиатская кухня с авторским взглядом. Сад с сакурой, панорамные окна, приватные кабинеты для деловых встреч.',
    hours: '12:00 – 01:00',
    lat: 51.177,
    lng: 71.448,
    features: ['🏆 Лучший ресторан 2024', '🌸 Сад', '💼 Деловые встречи', '🍷 Винная карта'],
    photos: ['🌸', '🍜', '🥗'],
    priceRange: 4,
    menu: [
      { name: 'Утиная грудка с манго', price: '5 600 ₸', emoji: '🦆', popular: true },
      { name: 'Рамен "Черный трюфель"', price: '4 200 ₸', emoji: '🍜', popular: true },
      { name: 'Тартар из тунца', price: '3 800 ₸', emoji: '🐟' },
      { name: 'Dim Sum корзинка', price: '2 900 ₸', emoji: '🥟' },
      { name: 'Десерт Матча', price: '1 600 ₸', emoji: '🍵' },
    ],
  },
  {
    id: 4,
    name: 'Steppe Grill House',
    type: 'Стейк-хаус',
    emoji: '🔥',
    color: '#FF6F00',
    tag: '🥩 Мясо',
    rating: 4.6,
    reviews: 742,
    dist: '680 м',
    time: '9 мин',
    price: '₸₸₸',
    open: true,
    address: 'пр. Победы, 77, Астана',
    phone: '+7 705 567 8901',
    description: 'Брутальный стейк-хаус с открытым угольным грилем. Говядина wagyu и Black Angus. Оценивайте прожарку через стекло прямо в зале. Живая рок-музыка по пятницам.',
    hours: '12:00 – 00:00',
    lat: 51.185,
    lng: 71.440,
    features: ['🔥 Угольный гриль', '🎸 Рок по пятницам', '🥃 Виски-бар', '👀 Открытая кухня'],
    photos: ['🥩', '🔥', '🍺'],
    priceRange: 3,
    menu: [
      { name: 'Рибай Wagyu 300г', price: '12 900 ₸', emoji: '🥩', popular: true },
      { name: 'Том Хок 1кг', price: '18 500 ₸', emoji: '🍖' },
      { name: 'Бургер Black Angus', price: '3 200 ₸', emoji: '🍔', popular: true },
      { name: 'Рёбра BBQ', price: '5 800 ₸', emoji: '🍖' },
      { name: 'Картофель фри с трюфелем', price: '1 400 ₸', emoji: '🍟' },
    ],
  },
  {
    id: 5,
    name: 'Green Sprout',
    type: 'Вегетарианская',
    emoji: '🌿',
    color: '#2E7D32',
    tag: '🌱 Эко',
    rating: 4.5,
    reviews: 418,
    dist: '410 м',
    time: '6 мин',
    price: '₸₸',
    open: false,
    address: 'ул. Бейбитшилик, 23, Астана',
    phone: '+7 707 678 9012',
    description: 'Растительная кухня нового поколения. Все продукты с органических ферм Казахстана. Авокадо-тосты, боул-ы и смузи-бар. Йога по утрам в соседнем зале.',
    hours: '08:00 – 21:00',
    lat: 51.179,
    lng: 71.455,
    features: ['🌱 100% Органик', '🧘 Йога', '♻️ Zero waste', '🥤 Смузи-бар'],
    photos: ['🥗', '🥑', '🧃'],
    priceRange: 2,
    menu: [
      { name: 'Боул "Астана"', price: '2 800 ₸', emoji: '🥗', popular: true },
      { name: 'Авокадо-тост с яйцом пашот', price: '1 900 ₸', emoji: '🥑', popular: true },
      { name: 'Смузи детокс', price: '1 200 ₸', emoji: '🥤' },
      { name: 'Веганский бургер', price: '2 400 ₸', emoji: '🍔' },
      { name: 'Тыквенный суп', price: '1 100 ₸', emoji: '🎃' },
    ],
  },
  {
    id: 6,
    name: 'Ciao Bella',
    type: 'Итальянская кухня',
    emoji: '🍝',
    color: '#1565C0',
    tag: '🇮🇹 Италия',
    rating: 4.6,
    reviews: 631,
    dist: '750 м',
    time: '10 мин',
    price: '₸₸₸',
    open: true,
    address: 'ул. Достык, 34, Астана',
    phone: '+7 708 789 0123',
    description: 'Аутентичная итальянская остерия. Тесто для пасты раскатывается вручную каждое утро. Итальянский шеф Марко привёз рецепты из Болоньи. Терраса с видом на сквер.',
    hours: '11:30 – 23:30',
    lat: 51.182,
    lng: 71.458,
    features: ['🍝 Ручная паста', '🍷 Итальянские вина', '🌅 Терраса', '🎻 Живая скрипка'],
    photos: ['🍕', '🍝', '🥂'],
    priceRange: 3,
    menu: [
      { name: 'Карбонара', price: '2 600 ₸', emoji: '🍝', popular: true },
      { name: 'Пицца Маргарита', price: '2 200 ₸', emoji: '🍕', popular: true },
      { name: 'Ризотто с грибами', price: '2 900 ₸', emoji: '🍚' },
      { name: 'Тирамису', price: '1 400 ₸', emoji: '☕' },
      { name: 'Капрезе', price: '1 800 ₸', emoji: '🫑' },
    ],
  },
];

// ─── AI RESPONSES ────────────────────────────────────────────────────────────

export const AI_RESPONSES: AIResponse[] = [
  {
    keywords: ['рядом', 'близко', 'недалеко', 'ближайш'],
    response: `📍 **Самые близкие к вам места:**\n\n**Sakura Garden** — 280м · ⭐ 4.9 · Фьюжн\n**Nauryz Dastarkhan** — 350м · ⭐ 4.8 · Казахская\n**Green Sprout** — 410м · ⭐ 4.5 · Веганское\n\nВсе три можно дойти пешком за 5-6 минут! 🚶`,
  },
  {
    keywords: ['дёшево', 'бюджет', 'недорого', '2000', '1500', '1000'],
    response: `💰 **Бюджетные варианты до 2 000 ₸:**\n\n**Nauryz Dastarkhan** — манты от 1 800 ₸ 🥟\n**Green Sprout** — тыквенный суп 1 100 ₸ 🎃\n\nСовет: в обед многие рестораны делают **бизнес-ланч** — блюдо + суп + напиток за 1 500-2 000 ₸ 🍱`,
  },
  {
    keywords: ['острое', 'острый', 'перец', 'пряный'],
    response: `🌶️ **Острое и пряное:**\n\n**Manga Sushi Bar** — Том Ям суп ⭐ уровень остроты 3/5\n**Sakura Garden** — блюда с чили по запросу\n**Steppe Grill** — острый соус к рёбрам BBQ\n\nПодсказка: просите "**매운맛 추가**" (добавить остроты) в азиатских ресторанах 😄`,
  },
  {
    keywords: ['свидание', 'романтик', 'девушк', 'парень', 'пара'],
    response: `💕 **Идеальные места для романтики:**\n\n🥇 **Sakura Garden** — сад с сакурой, приватные кабинеты, лучший вид · ₸₸₸₸\n🥈 **Ciao Bella** — терраса с живой скрипкой, итальянские вина · ₸₸₸\n🥉 **Manga Sushi Bar** — модная атмосфера, саке · ₸₸₸\n\nСовет: бронируйте заранее! В Sakura Garden места разбирают за 2-3 дня 🌸`,
  },
  {
    keywords: ['быстр', 'перекус', 'времени нет', 'ланч', 'обед'],
    response: `⚡ **Быстро и вкусно:**\n\n**Green Sprout** — боул за 12 минут ✅ · 410м\n**Nauryz Dastarkhan** — манты всегда готовы · 350м\n**Manga Sushi Bar** — сеты навынос · 520м\n\nСреднее время ожидания 10-15 минут 🏃`,
  },
  {
    keywords: ['казах', 'бешбармак', 'манты', 'лагман', 'куырдак'],
    response: `🇰🇿 **Казахская кухня в Астане:**\n\n**Nauryz Dastarkhan** — лучший бешбармак города ⭐ 4.8\nАдрес: ул. Сейфуллина, 12 · 350м от вас\n\nМаст-трай: **Бешбармак** 3 900 ₸ — баранина, конина или говядина на выбор\n\nПо вечерам играет живая **домбра** 🎶`,
  },
  {
    keywords: ['японск', 'суши', 'ролл', 'рамен', 'сашими'],
    response: `🎌 **Японская кухня:**\n\n⭐ **Manga Sushi Bar** — японский шеф Тарасо Ямамото\nСеты от 7 800 ₸ · 520м · Открыто до 00:00\n\n⭐ **Sakura Garden** — паназиатский фьюжн ⭐ 4.9\nРамен с чёрным трюфелем — вы не забудете 🍜`,
  },
  {
    keywords: ['веган', 'вегетар', 'пп', 'зож', 'здоров', 'органик'],
    response: `🌿 **ЗОЖ и веганское:**\n\n**Green Sprout** — 100% органик, все продукты с местных ферм\nБоул "Астана" 2 800 ₸ 🥗 · Смузи детокс 1 200 ₸\n\nВнимание: сейчас закрыто, открытие в 08:00\n\nАльтернатива: **Sakura Garden** — отдельное веганское меню по запросу 🌱`,
  },
  {
    keywords: ['стейк', 'мясо', 'гриль', 'шашлык', 'барбекю', 'bbq'],
    response: `🥩 **Мясные рестораны:**\n\n🔥 **Steppe Grill House** — угольный гриль, Wagyu и Black Angus\nРибай 300г — 12 900 ₸ (того стоит!)\n\nПо пятницам — **живая рок-музыка** 🎸\nАдрес: пр. Победы, 77 · 680м`,
  },
  {
    keywords: ['итальян', 'пицца', 'паста', 'карбонара', 'ризотто'],
    response: `🇮🇹 **Итальянская кухня:**\n\n**Ciao Bella** — шеф Марко из Болоньи\nПаста раскатывается вручную каждое утро 🫶\n\nТоп блюда:\n· Карбонара — 2 600 ₸\n· Пицца Маргарита — 2 200 ₸\n· Тирамису — 1 400 ₸\n\nТерраса с видом · Живая скрипка по выходным 🎻`,
  },
  {
    keywords: ['лучш', 'топ', 'рейтинг', 'рекомендуй', 'посоветуй'],
    response: `⭐ **Топ-3 Астаны:**\n\n🥇 **Sakura Garden** · 4.9 · 2156 отзывов\n🥈 **Nauryz Dastarkhan** · 4.8 · 1247 отзывов\n🥉 **Manga Sushi Bar** · 4.7 · 983 отзыва\n\nSakura Garden — лучший ресторан города по версии Zagat 2024 🏆\nБронирование обязательно!`,
  },
  {
    keywords: ['открыт', 'сейчас', 'работает'],
    response: `🟢 **Открыто прямо сейчас:**\n\n· 🏺 Nauryz Dastarkhan · 350м\n· 🍣 Manga Sushi Bar · 520м\n· 🌸 Sakura Garden · 280м\n· 🔥 Steppe Grill House · 680м\n· 🍝 Ciao Bella · 750м\n\n🔴 Закрыто: Green Sprout (откроется в 08:00)`,
  },
  {
    keywords: ['привет', 'hello', 'hi', 'здравствуй', 'хай'],
    response: `Привет! 👋 Рад тебя видеть!\n\nЯ **AI Гастрогид** — знаю все рестораны Астаны как свои пять пальцев 🍽️\n\nЧто сегодня хочется?\n· Подобрать место по настроению\n· Найти лучшее в определённой кухне\n· Узнать где открыто прямо сейчас\n\nСпроси что угодно! 😊`,
  },
  {
    keywords: ['спасиб', 'thanks', 'merci', 'рахмет'],
    response: `Всегда пожалуйста! 😊 Приятного аппетита!\n\nЕсли найдёте что-то вкусное — возвращайтесь, расскажите как было 🍽️✨`,
  },
];

// ─── SPECIAL OFFERS ──────────────────────────────────────────────────────────

export type Offer = {
  id: number;
  restaurantId: number;
  title: string;
  description: string;
  discount: string;
  expires: string;
  emoji: string;
  color: string;
};

export const SPECIAL_OFFERS: Offer[] = [
  {
    id: 1,
    restaurantId: 3,
    title: 'Бизнес-ланч',
    description: 'Суп + горячее + напиток в Sakura Garden',
    discount: '-30%',
    expires: '15:00',
    emoji: '🌸',
    color: '#9C27B0',
  },
  {
    id: 2,
    restaurantId: 1,
    title: 'Семейный ужин',
    description: 'Бешбармак на 4 персоны + баурсаки',
    discount: '-20%',
    expires: '21:00',
    emoji: '🏺',
    color: '#C0392B',
  },
  {
    id: 3,
    restaurantId: 4,
    title: 'Happy Hour',
    description: 'Стейки + напитки с 17:00 до 19:00',
    discount: '-25%',
    expires: '19:00',
    emoji: '🔥',
    color: '#FF6F00',
  },
  {
    id: 4,
    restaurantId: 2,
    title: 'Сет вечера',
    description: '40 роллов + 2 порции супа Том Ям',
    discount: '-15%',
    expires: '23:00',
    emoji: '🍣',
    color: '#E91E63',
  },
];