import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useAppSelector, useAppDispatch } from "@core/store/hooks";
import { resetAuthState } from "@features/auth/model/authSlice";
import { clearProfile } from "@entities/user/model/userSlice";
import { useRouter } from "expo-router";
import { Typography, PrimaryButton, SurfaceCard } from "@shared/ui";
import { useThemeMode } from "@shared/theme/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "styled-components/native";
import { roleDisplayName } from "@shared/constants/roles";

export default function SettingsScreen() {
  const profile = useAppSelector((s) => s.user.profile);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { mode, toggle } = useThemeMode();
  const theme = useTheme();

  const handleLogout = () => {
    dispatch(resetAuthState());
    dispatch(clearProfile());
    router.replace("/(auth)/landing");
  };

  const handleClose = () => {
    router.back();
  };

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Typography variant="title" style={styles.title}>
          Настройки
        </Typography>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {profile && (
            <SurfaceCard style={styles.profileCard}>
              <Typography variant="subtitle" style={styles.subtitle}>
                Информация о пользователе
              </Typography>
              <View style={styles.infoRow}>
                <Typography variant="body" style={styles.label}>
                  Имя:
                </Typography>
                <Typography variant="body" style={styles.value}>
                  {profile.fullName}
                </Typography>
              </View>
              <View style={styles.infoRow}>
                <Typography variant="body" style={styles.label}>
                  Email:
                </Typography>
                <Typography variant="body" style={styles.value}>
                  {profile.email}
                </Typography>
              </View>
              <View style={styles.infoRow}>
                <Typography variant="body" style={styles.label}>
                  Роль:
                </Typography>
                <Typography variant="body" style={styles.value}>
                  {roleDisplayName[profile.role]}
                </Typography>
              </View>
              <View style={styles.infoRow}>
                <Typography variant="body" style={styles.label}>
                  Уровень:
                </Typography>
                <Typography variant="body" style={styles.value}>
                  {profile.level}
                </Typography>
              </View>
            </SurfaceCard>
          )}

          <SurfaceCard style={styles.settingsCard}>
            <Typography variant="subtitle" style={styles.subtitle}>
              Настройки приложения
            </Typography>
            <View style={styles.settingRow}>
              <Typography variant="body">Темная тема</Typography>
              <Switch
                value={mode === "dark"}
                onValueChange={toggle}
                trackColor={{ false: "#E5E7EB", true: "#1E88E5" }}
                thumbColor={mode === "dark" ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>
          </SurfaceCard>

          <PrimaryButton onPress={handleLogout} style={styles.logoutButton}>
            Выйти
          </PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundAlt,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.background,
    },
    title: {
      margin: 0,
      fontSize: 22,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 20,
    },
    profileCard: {
      gap: 12,
    },
    subtitle: {
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: {
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },
    value: {
      color: theme.colors.text,
    },
    settingsCard: {
      gap: 12,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    logoutButton: {
      backgroundColor: theme.colors.danger,
      marginTop: 20,
    },
  });
