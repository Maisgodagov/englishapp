import { View, StyleSheet, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography, PrimaryButton } from "@shared/ui";
import { useTheme } from "styled-components/native";
import type { AppTheme } from "@shared/theme/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme() as AppTheme;

  const handleGetStarted = () => {
    router.push("/(auth)/landing");
  };

  return (
    <LinearGradient
      colors={["#4A90E2", "#5C6BC0", "#7E57C2"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Typography
                variant="title"
                align="center"
                style={styles.title}
                enableWordLookup={false}
              >
                English Platform
              </Typography>

              <Typography
                variant="body"
                align="center"
                style={styles.subtitle}
                enableWordLookup={false}
              >
                Изучайте английский язык легко и эффективно
              </Typography>
            </View>

            {/* Features */}
            <View style={styles.features}>
              <FeatureCard
                icon="📚"
                title="Интерактивные курсы"
                description="Структурированные уроки от базового до продвинутого уровня"
              />

              <FeatureCard
                icon="💬"
                title="Живой словарь"
                description="Нажмите на любое слово для перевода и озвучки"
              />

              <FeatureCard
                icon="🎯"
                title="Отслеживание прогресса"
                description="Следите за своими достижениями и поддерживайте streak"
              />
            </View>

            {/* CTA Button */}
            <View style={styles.ctaContainer}>
              <PrimaryButton
                onPress={handleGetStarted}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Начать обучение</Text>
              </PrimaryButton>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <View style={styles.featureCard}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureContent}>
      <Typography
        variant="subtitle"
        style={styles.featureTitle}
        enableWordLookup={false}
      >
        {title}
      </Typography>
      <Typography
        variant="body"
        style={styles.featureDescription}
        enableWordLookup={false}
      >
        {description}
      </Typography>
    </View>
  </View>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 12,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 18,
    lineHeight: 26,
  },
  features: {
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  featureIcon: {
    fontSize: 40,
  },
  featureContent: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  featureDescription: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    lineHeight: 20,
  },
  ctaContainer: {
    gap: 16,
  },
  ctaButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 8,
  },
  ctaButtonText: {
    color: "#5C6BC0",
    fontSize: 18,
    fontWeight: "700",
  },
  note: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
  },
});
