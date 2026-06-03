import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProfileMe, updateProfile, changePassword } from '../services/profile';
import { AppThemeColors, useAppTheme } from '@/lib/theme';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C, isDark } = useAppTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfileMe();
      setName(data.name || '');
      setCity(data.city || '');
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Ошибка', 'Введите город');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        name: name.trim(),
        city: city.trim(),
      });

      Alert.alert('Готово', 'Профиль обновлён');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (newPassword.trim().length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не короче 6 символов');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Ошибка', 'Новый пароль должен отличаться от текущего');
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      Alert.alert('Готово', 'Пароль изменён');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.response?.data?.detail || 'Ошибка смены пароля');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={s.title}>Редактировать профиль</Text>
      </View>

      <View style={s.body}>
        <Text style={s.label}>ИМЯ</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Ваше имя"
          placeholderTextColor={C.muted}
        />

        <Text style={s.label}>ГОРОД</Text>
        <TextInput
          style={s.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ваш город"
          placeholderTextColor={C.muted}
        />


        <Text style={s.label}>ТЕКУЩИЙ ПАРОЛЬ</Text>
        <TextInput
          style={s.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />

        <Text style={s.label}>НОВЫЙ ПАРОЛЬ</Text>
        <TextInput
          style={s.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <Text style={s.label}>ПОДТВЕРЖДЕНИЕ</Text>
        <TextInput
          style={s.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.saveBtn} onPress={handleChangePassword}>
          <Text style={s.saveText}>СМЕНИТЬ ПАРОЛЬ</Text>
        </TouchableOpacity>


        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading}>
          <Text style={s.saveText}>
            {loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (C: AppThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  back: {
    color: C.accent,
    fontWeight: '700',
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: C.dark,
  },

  body: {
    paddingHorizontal: 20,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    color: C.muted,
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: C.dark,
    marginBottom: 16,
  },

  saveBtn: {
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  saveText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
});
