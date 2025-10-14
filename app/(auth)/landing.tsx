import { View, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography, PrimaryButton, SecondaryButton } from "@shared/ui";
import { useTheme } from "styled-components/native";
import type { AppTheme } from "@shared/theme/theme";

export default function LandingScreen() {
  const router = useRouter();
  const theme = useTheme() as AppTheme;

  const handleRegister = () => {
    router.push("/(auth)/register");
  };

  const handleSignIn = () => {
    router.push("/(auth)/signin");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>🎓</Text>

        <Typography variant="title" align="center" style={styles.title}>
          Добро пожаловать!
        </Typography>

        <Typography
          variant="body"
          align="center"
          style={[styles.subtitle, { color: theme.colors.textSecondary }]}
        >
          Выберите, как вы хотите начать изучение английского языка
        </Typography>

        <View style={styles.buttons}>
          <PrimaryButton onPress={handleRegister} style={styles.button}>
            Создать аккаунт
          </PrimaryButton>

          <SecondaryButton onPress={handleSignIn} style={styles.button}>
            Войти
          </SecondaryButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 24,
    marginBottom: 24,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
  },
});
