import { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { PrimaryButton, Typography } from '@shared/ui';

export type AuthFormMode = 'login' | 'signup';

export interface LoginFormValues {
  email: string;
  password: string;
  fullName?: string;
}

export interface LoginFormProps {
  mode: AuthFormMode;
  onSubmit?: (values: LoginFormValues) => void;
  isLoading?: boolean;
}

export const LoginForm = ({ mode, onSubmit, isLoading = false }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (mode === 'login') {
      setFullName('');
    }
  }, [mode]);

  const handleSubmit = () => {
    onSubmit?.({
      email: email.trim(),
      password,
      fullName: mode === 'signup' ? fullName.trim() : undefined,
    });
  };

  const isDisabled = isLoading;

  return (
    <View style={styles.container}>
      {mode === 'signup' && (
        <View style={styles.group}>
          <Typography variant="caption">Полное имя</Typography>
          <TextInput
            style={styles.input}
            autoCapitalize="words"
            placeholder="Например, Мария Иванова"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
            editable={!isDisabled}
            returnKeyType="next"
          />
        </View>
      )}
      <View style={styles.group}>
        <Typography variant="caption">Email</Typography>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          editable={!isDisabled}
          autoComplete="email"
          returnKeyType="next"
        />
      </View>
      <View style={styles.group}>
        <Typography variant="caption">Пароль</Typography>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Введите пароль"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          editable={!isDisabled}
          autoComplete="password"
          returnKeyType="done"
        />
      </View>
      <PrimaryButton onPress={handleSubmit} disabled={isDisabled}>
        {mode === 'signup' ? 'Зарегистрироваться' : 'Войти'}
      </PrimaryButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  group: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
});
