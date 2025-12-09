import React from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { useAppDispatch, useAppSelector } from "@core/store/hooks";
import { resetAuthState } from "@features/auth/model/authSlice";
import { clearProfile } from "@entities/user/model/userSlice";
import { roleDisplayName } from "@shared/constants/roles";
import { useThemeMode } from "@shared/theme/ThemeProvider";
import { PrimaryButton, SurfaceCard, Typography } from "@shared/ui";

export default function SettingsScreen() {
  const profile = useAppSelector((s) => s.user.profile);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { mode, toggle } = useThemeMode();
  const theme = useTheme();
  const isAdmin = profile?.role === "admin";

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
          <X size={28} color={theme.colors.text} />
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
                trackColor={{ false: "#E5E7EB", true: theme.colors.primary }}
                thumbColor={mode === "dark" ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>
          </SurfaceCard>

          {isAdmin && (
            <SurfaceCard style={styles.settingsCard}>
              <Typography variant="subtitle" style={styles.subtitle}>
                Административные инструменты
              </Typography>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push("/admin/dictionary")}
              >
                <Typography variant="body" style={styles.linkText}>
                  Модерация словаря
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push("/admin/exercises")}
              >
                <Typography variant="body" style={styles.linkText}>
                  Модерация упражнений
                </Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push("/admin/lessons")}
              >
                <Typography variant="body" style={styles.linkText}>
                  Уроки (админ)
                </Typography>
              </TouchableOpacity>
            </SurfaceCard>
          )}

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
      backgroundColor: theme.colors.background,
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
    linkButton: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    linkText: {
      color: theme.colors.primary,
      fontWeight: "600",
    },
  });
