// ═══════════════════════════════════════════════════
//  app/onboarding.tsx
// ═══════════════════════════════════════════════════
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView, Platform,
  SafeAreaView, StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '@/services/auth';

const C = {
  bg: '#FDF8F2', dark: '#1A1208', accent: '#E8420A',
  muted: '#8C7B6B', border: '#EDE5D8', card: '#FFFFFF',
};

const SLIDES = [
  {
    id: '1',
    icon: <Ionicons name="restaurant" size={64} color="#E8420A" />,
    tag: 'АСТАНА',
    title: 'Вся еда города\nна одном экране',
    subtitle: 'Рестораны, кафе, уличная еда — от быстрого перекуса до изысканного ужина',
    bg: '#FFF3EE', accent: '#E8420A',
  },
  {
    id: '2',
    icon: <MaterialCommunityIcons name="star-four-points" size={64} color="#F5A623" />,
    tag: 'AI АССИСТЕНТ',
    title: 'Скажите что\nхотите съесть',
    subtitle: 'Умный ассистент поймёт ваши желания и найдёт идеальное место прямо сейчас',
    bg: '#FFF8EE', accent: '#F5A623',
  },
  {
    id: '3',
    icon: <Ionicons name="navigate" size={64} color="#2E7D32" />,
    tag: 'МАРШРУТЫ',
    title: 'Маршрут\nза секунду',
    subtitle: 'Время пешком или на машине — выбирайте как добраться до любого заведения',
    bg: '#EEFFF4', accent: '#2E7D32',
  },
  {
    id: '4',
    icon: <Ionicons name="heart" size={64} color="#D81B60" />,
    tag: 'ИЗБРАННОЕ',
    title: 'Сохраняйте\nлюбимые места',
    subtitle: 'Составляйте личный список, делитесь с друзьями и возвращайтесь снова',
    bg: '#FFF0F3', accent: '#D81B60',
  },
];

type Screen = 'slides' | 'auth' | 'login' | 'register';

function getInitialScreen(value: string | string[] | undefined): Screen {
  const screen = Array.isArray(value) ? value[0] : value;

  if (screen === 'auth' || screen === 'login' || screen === 'register') {
    return screen;
  }

  return 'slides';
}

export default function OnboardingScreen() {
  const [idx, setIdx] = useState(0);
  const params = useLocalSearchParams<{ screen?: string | string[] }>();
  const [screen, setScreen] = useState<Screen>(() => getInitialScreen(params.screen));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const insets = useSafeAreaInsets();

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentX = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenY = useRef(new Animated.Value(0)).current;

  const goToMain = async () => {
    await AsyncStorage.setItem('onboarded', '1');
    router.replace('/(tabs)');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }

    try {
      setLoading(true);
      await authService.login(email.trim(), password);
      await AsyncStorage.setItem('onboarded', '1');
      router.replace('/(tabs)');
    } catch (error) {
      console.log('Login error:', error);
      Alert.alert('Ошибка входа', 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не короче 6 символов');
      return;
    }

    try {
      setLoading(true);
      await authService.register(
        name.trim(),
        email.trim(),
        password,
        'Астана'
      );
      await AsyncStorage.setItem('onboarded', '1');
      router.replace('/(tabs)');
    } catch (error) {
      console.log('Register error:', error);
      Alert.alert('Ошибка регистрации', 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  };

  const changeSlide = (nextIdx: number) => {
    const direction = nextIdx > idx ? 50 : -50;
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(contentX, { toValue: -direction, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setIdx(nextIdx);
      contentX.setValue(direction);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(contentX, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  const switchScreen = (to: Screen) => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(screenY, { toValue: 20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setScreen(to);
      screenY.setValue(-20);
      Animated.parallel([
        Animated.timing(screenOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(screenY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (idx < SLIDES.length - 1) changeSlide(idx + 1);
    else switchScreen('auth');
  };

  const cur = SLIDES[idx];

  // ── ЭКРАН СЛАЙДОВ ──────────────────────────────────────────────────────────
  if (screen === 'slides') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: cur.bg }]}>
        <StatusBar barStyle="dark-content" />

        <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
          <View style={[s.pill, { borderColor: cur.accent + '50' }]}>
            <Text style={[s.pillText, { color: cur.accent }]}>{cur.tag}</Text>
          </View>
          <TouchableOpacity onPress={() => switchScreen('auth')}>
            <Text style={s.skip}>Пропустить</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[s.slideBody, { opacity: contentOpacity, transform: [{ translateX: contentX }] }]}>
          <View style={[s.ring, { backgroundColor: cur.accent + '15', borderColor: cur.accent + '30' }]}>
            <View style={[s.ringInner, { backgroundColor: cur.accent + '22' }]}>
              {cur.icon}
            </View>
          </View>
          <Text style={s.slideTitle}>{cur.title}</Text>
          <Text style={s.slideSub}>{cur.subtitle}</Text>
          <View style={[s.accentLine, { backgroundColor: cur.accent }]} />
        </Animated.View>

        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => changeSlide(i)}>
                <View style={[s.dot, { backgroundColor: i === idx ? cur.accent : C.border, width: i === idx ? 22 : 8 }]} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.btnRow}>
            {idx > 0 && (
              <TouchableOpacity style={[s.btnBack, { borderColor: cur.accent + '50' }]} onPress={() => changeSlide(idx - 1)}>
                <Ionicons name="arrow-back" size={14} color={cur.accent} style={{ marginRight: 4 }} />
                <Text style={[s.btnBackText, { color: cur.accent }]}>Назад</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btnNext, { backgroundColor: cur.accent, flex: idx > 0 ? 1.5 : 1 }]}
              onPress={goNext}
              activeOpacity={0.85}
            >
              <Text style={s.btnNextText}>{idx === SLIDES.length - 1 ? 'НАЧАТЬ' : 'ДАЛЕЕ'}</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
          <View style={s.links}>
            <TouchableOpacity onPress={() => switchScreen('login')}>
              <Text style={s.link}>Войти</Text>
            </TouchableOpacity>
            <Text style={{ color: C.border }}>·</Text>
            <TouchableOpacity onPress={goToMain}>
              <Text style={s.link}>Войти как гость</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── ЭКРАН ВЫБОРА AUTH ──────────────────────────────────────────────────────
  if (screen === 'auth') {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[s.wrap, { paddingTop: insets.top + 20, opacity: screenOpacity, transform: [{ translateY: screenY }] }]}>
          <View style={s.authTop}>
            <View style={s.logo}>
              <Ionicons name="restaurant" size={38} color={C.accent} />
            </View>
            <Text style={s.authTitle}>GastroGuide</Text>
            <Text style={s.authSub}>Найдите своё идеальное место{'\n'}для еды в Астане</Text>
          </View>
          <View style={s.cards}>
            <TouchableOpacity style={[s.card, s.cardPrimary]} onPress={() => switchScreen('register')} activeOpacity={0.9}>
              <Ionicons name="sparkles" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitleW}>Создать аккаунт</Text>
                <Text style={s.cardSubW}>Бесплатно · займёт 30 секунд</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.card} onPress={() => switchScreen('login')} activeOpacity={0.9}>
              <Ionicons name="person-outline" size={22} color={C.dark} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Войти в аккаунт</Text>
                <Text style={s.cardSub}>Уже есть аккаунт</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.guestBtn} onPress={goToMain}>
            <Text style={s.guestText}>Продолжить без аккаунта</Text>
          </TouchableOpacity>
          <Text style={s.terms}>
            Продолжая, вы соглашаетесь с <Text style={{ color: C.accent }}>Условиями</Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── ВХОД / РЕГИСТРАЦИЯ ─────────────────────────────────────────────────────
  const isLogin = screen === 'login';
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[s.wrap, { paddingTop: insets.top + 20, opacity: screenOpacity, transform: [{ translateY: screenY }] }]}>
          <TouchableOpacity onPress={() => switchScreen('auth')} style={s.back}>
            <Ionicons name="arrow-back" size={16} color={C.accent} style={{ marginRight: 6 }} />
            <Text style={s.backText}>Назад</Text>
          </TouchableOpacity>
          <Text style={s.formTitle}>{isLogin ? 'Добро\nпожаловать!' : 'Создать\nаккаунт'}</Text>
          <Text style={s.formSub}>{isLogin ? 'Введите данные аккаунта' : 'Займёт меньше минуты'}</Text>
          <View style={s.fields}>
            {!isLogin && (
              <View style={s.field}>
                <Text style={s.label}>ИМЯ</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="person-outline" size={16} color={C.muted} style={s.inputIcon} />
                  <TextInput style={s.input} placeholder="Ваше имя" placeholderTextColor={C.muted} value={name} onChangeText={setName} />
                </View>
              </View>
            )}
            <View style={s.field}>
              <Text style={s.label}>EMAIL</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={16} color={C.muted} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="example@email.com" placeholderTextColor={C.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.label}>ПАРОЛЬ</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={C.muted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={isLogin ? '••••••••' : 'Минимум 6 символов'}
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.7 }]}
            onPress={isLogin ? handleLogin : handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={s.submitText}>
              {loading ? 'ЗАГРУЗКА...' : isLogin ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
            </Text>
            {!loading && (
              <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
          {isLogin && (
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>Забыли пароль?</Text>
            </TouchableOpacity>
          )}
          <View style={s.switchRow}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}</Text>
            <TouchableOpacity onPress={() => switchScreen(isLogin ? 'register' : 'login')}>
              <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>{isLogin ? 'Зарегистрироваться' : 'Войти'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  pill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  skip: { fontSize: 13, color: C.muted, fontWeight: '600' },
  slideBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 20 },
  ring: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 36 },
  ringInner: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  slideTitle: { fontSize: 34, fontWeight: '900', color: C.dark, textAlign: 'center', lineHeight: 42, marginBottom: 14 },
  slideSub: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 23 },
  accentLine: { width: 40, height: 3, borderRadius: 2, marginTop: 24 },
  footer: { paddingHorizontal: 24 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btnBack: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5 },
  btnBackText: { fontSize: 13, fontWeight: '700' },
  btnNext: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16 },
  btnNextText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  link: { fontSize: 13, color: C.muted, fontWeight: '600' },
  wrap: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  authTop: { alignItems: 'center', paddingBottom: 36 },
  logo: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.accent + '15', borderWidth: 2, borderColor: C.accent + '25', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  authTitle: { fontSize: 28, fontWeight: '900', color: C.dark, marginBottom: 8 },
  authSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
  cards: { gap: 12, marginBottom: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  cardPrimary: { backgroundColor: C.accent, borderColor: C.accent },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.dark, marginBottom: 2 },
  cardSub: { fontSize: 11, color: C.muted },
  cardTitleW: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  cardSubW: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  guestBtn: { alignItems: 'center', padding: 15, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, marginBottom: 16 },
  guestText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  terms: { textAlign: 'center', fontSize: 11, color: C.muted },
  back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 20, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: C.accent, fontWeight: '700' },
  formTitle: { fontSize: 36, fontWeight: '900', color: C.dark, lineHeight: 44, marginBottom: 8 },
  formSub: { fontSize: 14, color: C.muted, marginBottom: 32 },
  fields: { gap: 16, marginBottom: 28 },
  field: { gap: 6 },
  label: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 1.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14 },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: C.dark },
  eyeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, borderRadius: 18, paddingVertical: 18, marginBottom: 12 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
});
