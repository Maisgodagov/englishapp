import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '@core/store/hooks';
import { authenticationSuccess, authenticateGuest } from '@features/auth/model/authSlice';
import { setProfile } from '@entities/user/model/userSlice';
import { Typography, PrimaryButton, Input, TextButton } from '@shared/ui';
import { useTheme } from 'styled-components/native';
import type { AppTheme } from '@shared/theme/theme';
import { UserRole } from '@shared/constants/roles';
import { authApi } from '@features/auth/api/authApi';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useTheme() as AppTheme;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
    };

    let isValid = true;

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Введите ваше имя';
      isValid = false;
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Имя должно содержать минимум 2 символа';
      isValid = false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: UserRole.Student,
      });

      dispatch(
        authenticationSuccess({
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          role: response.profile.role,
        })
      );
      dispatch(setProfile(response.profile));

      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Ошибка', error.message ?? 'Не удалось создать аккаунт. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin');
  };

  const handleGuestLogin = () => {
    dispatch(authenticateGuest());
    dispatch(
      setProfile({
        id: 'guest-1',
        email: 'guest@example.com',
        fullName: 'Гость',
        role: UserRole.Student,
        streakDays: 0,
        completedLessons: 0,
        level: 'Beginner',
        xpPoints: 0,
      })
    );
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>✍️</Text>
            <Typography variant="title" align="center" style={styles.title}>
              Создать аккаунт
            </Typography>
            <Typography variant="body" align="center" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Начните свое путешествие в мир английского языка
            </Typography>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Ваше имя"
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Иван Иванов"
              error={errors.fullName}
              autoCapitalize="words"
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="ivan@example.com"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Пароль"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Минимум 6 символов"
              error={errors.password}
              secureTextEntry
            />

            <PrimaryButton onPress={handleRegister} style={styles.registerButton} disabled={isLoading}>
              {isLoading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}
            </PrimaryButton>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Typography variant="caption" style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
              или
            </Typography>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Alternative Actions */}
          <View style={styles.actions}>
            <View style={styles.signInContainer}>
              <Typography variant="body" style={{ color: theme.colors.textSecondary }}>
                Уже есть аккаунт?{' '}
              </Typography>
              <TextButton onPress={handleSignIn}>
                Войти
              </TextButton>
            </View>

            <TextButton onPress={handleGuestLogin} style={styles.guestButton} disabled={isLoading}>
              Продолжить как гость
            </TextButton>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  registerButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 8,
  },
  actions: {
    gap: 16,
    alignItems: 'center',
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestButton: {
    paddingVertical: 12,
  },
});
