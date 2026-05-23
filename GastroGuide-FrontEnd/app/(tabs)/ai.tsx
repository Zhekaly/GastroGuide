import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/auth';
import {
  createAISession,
  getAISessionMessages,
  getAISessions,
  sendAIMessage,
  deleteAISession,
  RestaurantCard as RestaurantCardType,
} from '../../services/ai';
import { getOffers, Offer } from '../../services/offers';
import * as Location from 'expo-location';


const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = SCREEN_W * 0.78;

const C = {
  bg: '#FDF8F2', dark: '#1A1208', accent: '#E8420A',
  muted: '#8C7B6B', border: '#EDE5D8', green: '#2E7D32', card: '#FFFFFF',
  drawerBg: '#1A1208',
  drawerCard: '#2A1F12',
  drawerBorder: '#3A2E1E',
  drawerMuted: '#8C7B6B',
  drawerAccent: '#E8420A',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Msg = {
  id: number;
  role: 'ai' | 'user';
  text: string;
  time: string;
  cards?: RestaurantCardType[];
};

type Session = {
  id: string;
  title: string;
  preview: string;
  date: string;
  isoDate: string;
  messages: Msg[];
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ai_chat_sessions_v1';

async function loadSessions(): Promise<Session[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveSessions(sessions: Session[]): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nowTime = () =>
  new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
};

const makeWelcome = (): Msg => ({
  id: Date.now(),
  role: 'ai',
  time: nowTime(),
  text: 'Привет! Я **AI Гастрогид** — помогу найти лучшее место для еды в Астане.\n\nСпросите что угодно — знаю все рестораны города!',
});

const makeNewSession = (): Session => {
  const iso = new Date().toISOString();
  return {
    id: String(Date.now()),
    title: 'Новый чат',
    preview: '',
    date: formatDate(iso),
    isoDate: iso,
    messages: [makeWelcome()],
  };
};

const QUICK = [
  { label: 'Что рядом?', q: 'Что рядом со мной?',         icon: 'location-outline' as const },
  { label: 'До 2000 ₸', q: 'Хочу поесть до 2000 тг',      icon: 'cash-outline' as const },
  { label: 'Острое',     q: 'Хочу острое',                 icon: 'flame-outline' as const },
  { label: 'Свидание',   q: 'Ресторан для свидания',        icon: 'heart-outline' as const },
  { label: 'Быстро',     q: 'Быстро поесть',               icon: 'flash-outline' as const },
  { label: 'Казахская',  q: 'Казахская кухня',              icon: 'restaurant-outline' as const },
  { label: 'Суши',       q: 'Японская кухня суши',          icon: 'restaurant-outline' as const },
  { label: 'Лучшее',     q: 'Лучший ресторан по рейтингу', icon: 'star-outline' as const },
  { label: 'Веган',      q: 'Вегетарианская еда',           icon: 'leaf-outline' as const },
  { label: 'Открыто',    q: 'Что открыто сейчас?',         icon: 'time-outline' as const },
];

// ─── BoldText ─────────────────────────────────────────────────────────────────

function BoldText({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={[ch.msgText, isUser ? ch.msgUser : ch.msgAI]}>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <Text key={i} style={{ fontWeight: '800', color: isUser ? '#fff' : C.accent }}>{p}</Text>
          : p
      )}
    </Text>
  );
}

// ─── RestaurantCard ───────────────────────────────────────────────────────────

function RestaurantCardItem({ card }: { card: RestaurantCardType }) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !card.photo || imgError;

  return (
    <TouchableOpacity
      style={rc.card}
      activeOpacity={0.82}
      onPress={() => router.push({ pathname: '/detail', params: { id: card.id } })}
      accessibilityLabel={`${card.name}${card.tag ? ', ' + card.tag : ''}`}
    >
      {/* Thumbnail with tag badge overlay */}
      <View style={rc.thumbWrapper}>
        {showPlaceholder ? (
          <View style={[rc.thumb, { backgroundColor: card.color ?? '#E8420A' }]}>
            <Text style={rc.thumbEmoji}>{card.emoji ?? '🍽️'}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: card.photo! }}
            style={rc.thumb}
            contentFit="cover"
            onError={() => setImgError(true)}
          />
        )}
        {card.tag ? (
          <View style={rc.tagBadge}>
            <Text style={rc.tagText} numberOfLines={1}>{card.tag}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={rc.info}>
        <Text style={rc.name} numberOfLines={2}>
          {card.name}
        </Text>

        <View style={rc.row}>
          <Text style={rc.ratingText}>
            {card.rating === 0 ? '⭐ новый' : `${card.rating}★`}
          </Text>
          {card.distance ? (
            <Text style={rc.meta}> · {card.distance}</Text>
          ) : null}
        </View>

        <View style={rc.row}>
          {card.category ? (
            <Text style={rc.meta}>{card.category}</Text>
          ) : null}
          {card.price ? (
            <Text style={rc.meta}> · {card.price}</Text>
          ) : null}
        </View>

        <View style={[rc.openBadge, { backgroundColor: card.is_open ? '#E8F5E9' : '#FFEBEE' }]}>
          <View style={[rc.dot, { backgroundColor: card.is_open ? '#2E7D32' : '#D32F2F' }]} />
          <Text style={[rc.openText, { color: card.is_open ? '#2E7D32' : '#D32F2F' }]}>
            {card.is_open ? 'Открыто' : 'Закрыто'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── TypingDots ───────────────────────────────────────────────────────────────

function TypingDots() {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a = Animated.parallel([anim(a1, 0), anim(a2, 200), anim(a3, 400)]);
    a.start();
    return () => a.stop();
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 4 }}>
      {[a1, a2, a3].map((a, i) => (
        <Animated.View key={i} style={{
          width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent,
          opacity: a,
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
        }} />
      ))}
    </View>
  );
}

// ─── SIDEBAR DRAWER ───────────────────────────────────────────────────────────

function Drawer({
  sessions,
  activeId,
  drawerAnim,
  overlayAnim,
  onClose,
  onNew,
  onSelect,
  onDelete,
  insets,
}: {
  sessions: Session[];
  activeId: string;
  drawerAnim: Animated.Value;
  overlayAnim: Animated.Value;
  onClose: () => void;
  onNew: () => void;
  onSelect: (s: Session) => void;
  onDelete: (id: string) => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  // Группировка по дате
  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = s.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <>
      {/* Overlay */}
      <Animated.View
        pointerEvents="box-none"
        style={[ch.overlay, { opacity: overlayAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          ch.drawer,
          { transform: [{ translateX: drawerAnim }], paddingTop: insets.top },
        ]}
      >
        {/* Drawer header */}
        <View style={ch.drawerHeader}>
          <View style={ch.drawerLogo}>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#fff" />
          </View>
          <Text style={ch.drawerTitle}>AI Гастрогид</Text>
          <TouchableOpacity style={ch.drawerCloseBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={C.drawerMuted} />
          </TouchableOpacity>
        </View>

        {/* New chat button */}
        <TouchableOpacity style={ch.drawerNewBtn} onPress={() => { onNew(); onClose(); }} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={ch.drawerNewText}>Новый чат</Text>
        </TouchableOpacity>

        {/* Sessions list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          style={{ flex: 1 }}
        >
          {sessions.length === 0 ? (
            <View style={ch.drawerEmpty}>
              <Text style={ch.drawerEmptyText}>История пуста</Text>
              <Text style={ch.drawerEmptyHint}>Ваши чаты появятся здесь</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([date, group]) => (
              <View key={date}>
                <Text style={ch.drawerGroupLabel}>{date}</Text>
                {group.map(s => {
                  const isActive = s.id === activeId;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[ch.drawerItem, isActive && ch.drawerItemActive]}
                      onPress={() => { onSelect(s); onClose(); }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[ch.drawerItemTitle, isActive && ch.drawerItemTitleActive]}
                        numberOfLines={1}
                      >
                        {s.title}
                      </Text>
                      {s.preview ? (
                        <Text style={ch.drawerItemPreview} numberOfLines={1}>{s.preview}</Text>
                      ) : null}
                      <TouchableOpacity
                        style={ch.drawerItemDelete}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() =>
                          Alert.alert('Удалить чат?', 'Это нельзя отменить', [
                            { text: 'Отмена', style: 'cancel' },
                            { text: 'Удалить', style: 'destructive', onPress: () => onDelete(s.id) },
                          ])
                        }
                      >
                        <Feather name="trash-2" size={12} color={isActive ? 'rgba(255,255,255,0.5)' : C.drawerMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[ch.drawerFooter, { paddingBottom: insets.bottom + 12 }]}>
          <View style={ch.drawerFooterBadge}>
            <MaterialCommunityIcons name="star-four-points" size={10} color={C.accent} />
            <Text style={ch.drawerFooterText}>AI-помощник</Text>
          </View>
          <Text style={ch.drawerFooterSub}>GastroGuide · Астана</Text>
        </View>
      </Animated.View>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

function mapBackendSessionToUi(session: {
  id: string;
  title: string;
  preview: string | null;
  created_at: string;
  updated_at: string;
}): Session {
  return {
    id: session.id,
    title: session.title || 'Новый чат',
    preview: session.preview || '',
    date: formatDate(session.updated_at || session.created_at),
    isoDate: session.updated_at || session.created_at,
    messages: [makeWelcome()],
  };
}

function mapBackendMessagesToUi(messages: {
  id: number;
  role: 'user' | 'ai';
  text: string;
  created_at: string;
}[]): Msg[] {
  return messages.map(m => ({
    id: m.id,
    role: m.role,
    text: m.text,
    time: new Date(m.created_at).toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cards: [],
  }));
}

function isAuthError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes('Could not validate credentials') ||
    err.message.includes('401')
  );
}

export default function AIScreen() {
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session>(makeNewSession());
  const [messages, setMessages] = useState<Msg[]>(activeSession.messages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number; lng: number} | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Drawer animation: starts off-screen to the left
  const drawerAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const backendSessions = await getAISessions();
          const mappedSessions = backendSessions.map(mapBackendSessionToUi);

          setSessions(mappedSessions);

          if (mappedSessions.length > 0) {
            const first = mappedSessions[0];
            setActiveSession(first);

            const backendMessages = await getAISessionMessages(first.id);
            const mappedMessages = mapBackendMessagesToUi(backendMessages);
            setMessages(mappedMessages.length > 0 ? mappedMessages : [makeWelcome()]);
          } else {
            const fresh = makeNewSession();
            setActiveSession(fresh);
            setMessages(fresh.messages);
          }
        } else {
          const saved = await loadSessions();
          setSessions(saved);

          if (saved.length > 0) {
            setActiveSession(saved[0]);
            setMessages(saved[0].messages);
          }
        }
      } catch (e) {
        if (!isAuthError(e)) {
          console.error('Failed to bootstrap AI screen:', e);
        }

        setIsAuthenticated(false);

        const saved = await loadSessions();
        setSessions(saved);

        if (saved.length > 0) {
          setActiveSession(saved[0]);
          setMessages(saved[0].messages);
        } else {
          const fresh = makeNewSession();
          setActiveSession(fresh);
          setMessages(fresh.messages);
        }
      }

      getOffers().then(setOffers).catch(() => {});

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setUserCoords({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      } catch (locationErr) {
        console.error('Failed to get AI user location:', locationErr);
      }
    };

    bootstrap();
  }, []);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages, loading]);

  // ── Drawer open/close ────────────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: -DRAWER_W, useNativeDriver: true, damping: 22, stiffness: 220 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }, []);

  // ── Save session ────────────────────────────────────────────────────────────
  const persistSession = useCallback(async (sess: Session, msgs: Msg[]) => {
    const userMsgs = msgs.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;

    const lastMsg = msgs[msgs.length - 1];
    const iso = new Date().toISOString();

    const updated: Session = {
      ...sess,
      title: userMsgs[0].text.slice(0, 48) + (userMsgs[0].text.length > 48 ? '…' : ''),
      preview: lastMsg.text.replace(/\*\*/g, '').slice(0, 65),
      date: formatDate(iso),
      isoDate: iso,
      messages: msgs,
    };

    setActiveSession(updated);

    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === updated.id);
      const next = idx >= 0
        ? [updated, ...prev.filter((_, i) => i !== idx)]
        : [updated, ...prev];

      if (!isAuthenticated) {
        saveSessions(next);
      }

      return next;
    });
  }, [isAuthenticated]);

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    const sess = makeNewSession();
    setActiveSession(sess);
    setMessages(sess.messages);
    setInput('');
  }, []);

  // ── Select session ──────────────────────────────────────────────────────────
  const handleSelect = useCallback(async (s: Session) => {
    setActiveSession(s);
    setInput('');

    if (isAuthenticated) {
      try {
        const backendMessages = await getAISessionMessages(s.id);
        const mappedMessages = mapBackendMessagesToUi(backendMessages);
        setMessages(mappedMessages.length > 0 ? mappedMessages : [makeWelcome()]);
      } catch (e) {
        if (!isAuthError(e)) {
          console.error('Failed to load session messages:', e);
        }

        setIsAuthenticated(false);
        setMessages(s.messages?.length ? s.messages : [makeWelcome()]);
      }
    } else {
      setMessages(s.messages);
    }
  }, [isAuthenticated]);

  // ── Delete session ──────────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    if (isAuthenticated) {
      Alert.alert('Удалить чат', 'Вы уверены, что хотите удалить эту сессию?', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAISession(id);

              const backendSessions = await getAISessions();
              const mappedSessions = backendSessions.map(mapBackendSessionToUi);

              setSessions(mappedSessions);

              if (activeSession.id === id) {
                if (mappedSessions.length > 0) {
                  const first = mappedSessions[0];
                  setActiveSession(first);

                  const backendMessages = await getAISessionMessages(first.id);
                  const mappedMessages = mapBackendMessagesToUi(backendMessages);
                  setMessages(mappedMessages.length > 0 ? mappedMessages : [makeWelcome()]);
                } else {
                  const fresh = makeNewSession();
                  setActiveSession(fresh);
                  setMessages(fresh.messages);
                }
              }
            } catch (e) {
              console.error('Failed to delete AI session:', e);
              Alert.alert('Ошибка', 'Не удалось удалить чат');
            }
          },
        },
      ]);
      return;
    }

    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next);

      if (activeSession.id === id) {
        const fallback = next[0] ?? makeNewSession();
        setActiveSession(fallback);
        setMessages(fallback.messages);
      }

      return next;
    });
  }, [activeSession, isAuthenticated]);

  // ── Send message ────────────────────────────────────────────────────────────
  const send = async (override?: string) => {
    const msg = (override ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    inputRef.current?.blur();
    if (Platform.OS !== 'web') Vibration.vibrate(10);

    const userMsg: Msg = { id: Date.now(), role: 'user', text: msg, time: nowTime() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setLoading(true);

    await new Promise(r => setTimeout(r, 250));

    const aiHistory = messages.map(m => ({
        role: m.role as 'user' | 'ai',
        text: m.text,
      }));

    try {
      let serverSessionId: string | null = null;

      if (isAuthenticated) {
        // Если это новая локальная сессия без серверного UUID — создаём её на сервере
        const looksLikeLocalTempId = /^\d+$/.test(activeSession.id);

        if (looksLikeLocalTempId && activeSession.title === 'Новый чат') {
          const created = await createAISession(msg.slice(0, 48));

          const newServerSession: Session = {
            id: created.id,
            title: created.title || msg.slice(0, 48),
            preview: created.preview || '',
            date: formatDate(created.updated_at || created.created_at),
            isoDate: created.updated_at || created.created_at,
            messages: [makeWelcome()],
          };

          setActiveSession(newServerSession);
          serverSessionId = created.id;
        } else {
          serverSessionId = activeSession.id;
        }
      }

      const response = await sendAIMessage(
        msg,
        aiHistory,
        isAuthenticated ? serverSessionId : null,
        userCoords
      );

      const aiMsg: Msg = {
        id: Date.now() + 1,
        role: 'ai',
        text: response.response,
        time: nowTime(),
        cards: response.cards,
      };

      const finalMsgs = [...nextMsgs, aiMsg];
      setMessages(finalMsgs);

      if (isAuthenticated) {
        const backendSessions = await getAISessions();
        const mappedSessions = backendSessions.map(mapBackendSessionToUi);
        setSessions(mappedSessions);

        const currentId = serverSessionId || activeSession.id;
        const updatedActive =
          mappedSessions.find(s => s.id === currentId) || mappedSessions[0];

        if (updatedActive) {
          setActiveSession(updatedActive);
        }
      } else {
        await persistSession(activeSession, finalMsgs);
      }
    } catch (e) {
      if (isAuthError(e)) {
        try {
          setIsAuthenticated(false);

          const response = await sendAIMessage(msg, aiHistory, null, userCoords);

          const aiMsg: Msg = {
            id: Date.now() + 1,
            role: 'ai',
            text: response.response,
            time: nowTime(),
            cards: response.cards,
          };

          const finalMsgs = [...nextMsgs, aiMsg];
          setMessages(finalMsgs);
          await persistSession(activeSession, finalMsgs);
          return;
        } catch (fallbackErr) {
          console.error('AI guest fallback failed:', fallbackErr);
        }
      } else {
        console.error('AI send failed:', e);
      }

      const errMsg: Msg = {
        id: Date.now() + 1,
        role: 'ai',
        time: nowTime(),
        text: 'Извините, AI сейчас недоступен. Попробуйте ещё раз чуть позже.',
      };

      const finalMsgs = [...nextMsgs, errMsg];
      setMessages(finalMsgs);

      if (!isAuthenticated) {
        await persistSession(activeSession, finalMsgs);
      }
    } finally {
      setLoading(false);
    }
  };

  const chatTitle = activeSession.title === 'Новый чат'
    ? 'AI Гастрогид'
    : activeSession.title;

  return (
    <View style={ch.root}>
      <SafeAreaView style={ch.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        {/* ── HEADER ── */}
        <View style={[ch.header, { paddingTop: insets.top + 12 }]}>
          {/* Burger — открывает drawer */}
          <TouchableOpacity style={ch.headerBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={22} color={C.dark} />
          </TouchableOpacity>

          <View style={ch.headerCenter}>
            <View style={ch.headerAvatar}>
              <MaterialCommunityIcons name="star-four-points" size={14} color="#fff" />
            </View>
            <View>
              <Text style={ch.headerName} numberOfLines={1}>{chatTitle}</Text>
              <Text style={ch.headerStatus}>● Онлайн</Text>
            </View>
          </View>

          {/* Новый чат */}
          <TouchableOpacity style={ch.headerBtn} onPress={handleNew}>
            <Feather name="edit" size={18} color={C.dark} />
          </TouchableOpacity>
        </View>

        {/* ── OFFERS ── */}
        {offers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={ch.offersRow}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
          >
            {offers.map(offer => (
              <View key={offer.id} style={[ch.offerChip, { borderColor: offer.color + '40', backgroundColor: offer.color + '0A' }]}>
                <Ionicons name="pricetag-outline" size={12} color={offer.color} />
                <Text style={[ch.offerText, { color: offer.color }]}>{offer.title}</Text>
                {offer.discount ? (
                  <View style={[ch.offerBadge, { backgroundColor: offer.color }]}>
                    <Text style={ch.offerBadgeText}>{offer.discount}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* ── MESSAGES ── */}
          <ScrollView
            ref={scrollRef}
            style={ch.msgArea}
            contentContainerStyle={ch.msgContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={ch.dateBadge}>
              <Text style={ch.dateText}>{activeSession.date}</Text>
            </View>

            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const showTime = idx === messages.length - 1 || messages[idx + 1]?.role !== m.role;
              const hasCards = !isUser && m.cards && m.cards.length > 0;
              return (
                <View key={m.id} style={{ marginBottom: 2 }}>
                  <View style={[ch.msgRow, isUser ? ch.rowUser : ch.rowAI]}>
                    {!isUser && (
                      <View style={ch.smallAvatar}>
                        <MaterialCommunityIcons name="star-four-points" size={10} color="#fff" />
                      </View>
                    )}
                    <View style={[ch.msgCol, isUser && { alignItems: 'flex-end' }]}>
                      <View style={[ch.bubble, isUser ? ch.bubbleUser : ch.bubbleAI]}>
                        <BoldText text={m.text} isUser={isUser} />
                      </View>
                      {hasCards && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={ch.cardsScroll}
                          contentContainerStyle={ch.cardsRow}
                          keyboardShouldPersistTaps="handled"
                        >
                          {m.cards!.map(card => (
                            <RestaurantCardItem key={card.id} card={card} />
                          ))}
                        </ScrollView>
                      )}
                      {showTime && <Text style={ch.timeText}>{m.time}</Text>}
                    </View>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[ch.msgRow, ch.rowAI]}>
                <View style={ch.smallAvatar}>
                  <MaterialCommunityIcons name="star-four-points" size={10} color="#fff" />
                </View>
                <View style={ch.typingBubble}>
                  <TypingDots />
                  <Text style={ch.typingText}>думаю...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── QUICK CHIPS ── */}
          <View style={ch.quickWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ch.quickRow}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK.map(q => (
                <TouchableOpacity key={q.q} style={ch.quickChip} onPress={() => send(q.q)} activeOpacity={0.75}>
                  <Ionicons name={q.icon} size={12} color={C.muted} />
                  <Text style={ch.quickText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── INPUT ── */}
          <View style={ch.inputBar}>
            <View style={ch.inputWrap}>
              <TextInput
                ref={inputRef}
                style={ch.textInput}
                placeholder="Спросите про еду в Астане..."
                placeholderTextColor={C.muted}
                value={input}
                onChangeText={setInput}
                returnKeyType="send"
                onSubmitEditing={() => send()}
                multiline
                maxLength={400}
                blurOnSubmit={false}
              />
              {input.trim().length > 0 && (
                <TouchableOpacity style={ch.sendBtn} onPress={() => send()} disabled={loading} activeOpacity={0.85}>
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── DRAWER (поверх всего) ── */}
      {drawerOpen && (
        <Drawer
          sessions={sessions}
          activeId={activeSession.id}
          drawerAnim={drawerAnim}
          overlayAnim={overlayAnim}
          onClose={closeDrawer}
          onNew={handleNew}
          onSelect={handleSelect}
          onDelete={handleDelete}
          insets={insets}
        />
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const ch = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4,
  },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  headerName: { fontSize: 14, fontWeight: '800', color: C.dark, maxWidth: SCREEN_W * 0.45 },
  headerStatus: { fontSize: 9, color: C.green, fontWeight: '600', marginTop: 1 },

  // Offers
  offersRow: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: C.border },
  offerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  offerText: { fontSize: 11, fontWeight: '700' },
  offerBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  offerBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  // Messages
  msgArea: { flex: 1, backgroundColor: C.bg },
  msgContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 4 },
  dateBadge: {
    alignSelf: 'center', backgroundColor: C.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12,
  },
  dateText: { fontSize: 10, color: C.muted, fontWeight: '600' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 2 },
  rowAI: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  smallAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 18,
  },
  msgCol: { flex: 1, maxWidth: '80%' },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAI: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  bubbleUser: {
    backgroundColor: C.accent, borderBottomRightRadius: 4, alignSelf: 'flex-end',
    shadowColor: C.accent, shadowOpacity: 0.22, shadowRadius: 6, elevation: 3,
  },
  msgText: { fontSize: 14, lineHeight: 21 },
  msgAI: { color: C.dark },
  msgUser: { color: '#fff' },
  timeText: { fontSize: 9, color: C.muted, marginTop: 4, marginHorizontal: 4 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 20, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  typingText: { fontSize: 12, color: C.muted },

  // Quick chips
  quickWrap: { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, paddingVertical: 10 },
  quickRow: { paddingHorizontal: 14, gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  quickText: { fontSize: 12, color: C.dark, fontWeight: '600' },

  // Input
  inputBar: {
    paddingHorizontal: 14, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 28, paddingLeft: 18, paddingRight: 6, paddingVertical: 6,
    minHeight: 50,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  textInput: { flex: 1, fontSize: 14, color: C.dark, maxHeight: 100, paddingVertical: 8, lineHeight: 20 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
    shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },

  // ── DRAWER ──────────────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: DRAWER_W,
    backgroundColor: C.drawerBg,
    zIndex: 20,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.drawerBorder,
  },
  drawerLogo: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  drawerTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#fff' },
  drawerCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.drawerCard,
    alignItems: 'center', justifyContent: 'center',
  },

  drawerNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 14, marginBottom: 6,
    backgroundColor: C.drawerCard,
    borderWidth: 1, borderColor: C.drawerBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  drawerNewText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  drawerGroupLabel: {
    fontSize: 9, fontWeight: '700', color: C.drawerMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4,
  },

  drawerItem: {
    marginHorizontal: 8, marginBottom: 2,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'column',
    position: 'relative',
  },
  drawerItemActive: {
    backgroundColor: C.drawerCard,
    borderWidth: 1, borderColor: C.drawerBorder,
  },
  drawerItemTitle: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)',
    paddingRight: 24,
  },
  drawerItemTitleActive: { color: '#fff', fontWeight: '700' },
  drawerItemPreview: {
    fontSize: 11, color: C.drawerMuted, marginTop: 2, paddingRight: 24,
  },
  drawerItemDelete: {
    position: 'absolute', right: 10, top: 10,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  drawerEmpty: { paddingHorizontal: 20, paddingTop: 32, alignItems: 'center' },
  drawerEmptyText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  drawerEmptyHint: { fontSize: 11, color: C.drawerMuted, textAlign: 'center' },

  drawerFooter: {
    borderTopWidth: 1, borderTopColor: C.drawerBorder,
    paddingHorizontal: 16, paddingTop: 12,
    alignItems: 'flex-start', gap: 4,
  },
  drawerFooterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accent + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.accent + '30',
  },
  drawerFooterText: { fontSize: 10, color: C.accent, fontWeight: '700' },
  drawerFooterSub: { fontSize: 10, color: C.drawerMuted, marginLeft: 2 },

  // Cards row
  cardsScroll: { marginTop: 10, marginLeft: -4 },
  cardsRow: { gap: 10, paddingRight: 8 },
});

// ─── RestaurantCard styles ─────────────────────────────────────────────────────

const rc = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EDE5D8',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  thumbWrapper: {
    width: '100%',
    height: 100,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  thumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#EDE5D8',
  },
  thumbEmoji: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 100,
  },
  tagBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 130,
  },
  tagText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  info: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1208',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11,
    color: '#8C7B6B',
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    color: '#8C7B6B',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openText: {
    fontSize: 10,
    fontWeight: '700',
  },
});