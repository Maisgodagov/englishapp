import { useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "styled-components/native";

import { useAppDispatch, useAppSelector } from "@core/store/hooks";
import { Typography } from "@shared/ui";
import {
  fetchRoadmap,
  selectRoadmapError,
  selectRoadmapModules,
  selectRoadmapStatus,
} from "@features/roadmap/model/roadmapSlice";
import { RoadmapTrack } from "@features/roadmap/ui/RoadmapTrack";

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.user.profile);
  const modules = useAppSelector(selectRoadmapModules);
  const roadmapStatus = useAppSelector(selectRoadmapStatus);
  const roadmapError = useAppSelector(selectRoadmapError);
  const theme = useTheme();

  useEffect(() => {
    if (roadmapStatus === "idle") {
      dispatch(fetchRoadmap());
    }
  }, [dispatch, roadmapStatus]);

  const styles = useMemo(() => getStyles(theme), [theme]);
  const isLoading = roadmapStatus === "loading";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        {profile && (
          <View style={styles.statItem}>
            <Ionicons name="trophy-outline" size={22} color="#F59E0B" />
            <Typography variant="body" style={styles.statValue}>
              {profile.xpPoints}
            </Typography>
          </View>
        )}

        <Typography variant="title" style={styles.appTitle}>
          Platform
        </Typography>

        {profile && (
          <View style={styles.statItem}>
            <Ionicons name="flame-outline" size={22} color="#EF4444" />
            <Typography variant="body" style={styles.statValue}>
              {profile.streakDays}
            </Typography>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {isLoading && (
            <View style={styles.stateCard}>
              <Typography variant="body" align="center">
                {"Загружаем ваш путь..."}
              </Typography>
            </View>
          )}

          {!isLoading && roadmapError && (
            <View style={styles.stateCard}>
              <Typography variant="body" align="center" style={styles.errorText}>
                {roadmapError}
              </Typography>
            </View>
          )}

          {!isLoading && !roadmapError && modules.length > 0 && (
            <RoadmapTrack modules={modules} />
          )}
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
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    appTitle: {
      margin: 0,
      fontSize: 22,
      fontWeight: "700",
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minWidth: 60,
    },
    statValue: {
      fontWeight: "600",
      color: theme.colors.text,
      fontSize: 14,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 32,
    },
    stateCard: {
      paddingVertical: 32,
      paddingHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    errorText: {
      color: theme.colors.danger,
    },
  });
