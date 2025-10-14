import { useEffect } from "react";
import { FlatList, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "styled-components/native";

import { useAppSelector, useAppDispatch } from "@core/store/hooks";
import { seedMockCourses } from "@features/courses/model/coursesSlice";
import { CourseCard } from "@features/courses/ui/CourseCard";
import { Typography } from "@shared/ui";

export default function CoursesScreen() {
  const enrolled = useAppSelector((s) => s.courses.enrolled);
  const featured = useAppSelector((s) => s.courses.featured);
  const dispatch = useAppDispatch();
  const theme = useTheme();

  useEffect(() => {
    dispatch(seedMockCourses());
  }, [dispatch]);

  const data = [...enrolled, ...featured];
  const totalCourses = data.length;
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.statPill}>
          <Ionicons
            name="library-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Typography variant="caption" style={styles.statText}>
            {totalCourses}
          </Typography>
        </View>
        <View style={styles.headerTitle}>
          <Typography variant="title" style={styles.headerText}>
            Курсы
          </Typography>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statPill}>
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Typography variant="caption" style={styles.statText}>
              {enrolled.length}
            </Typography>
          </View>
        </View>
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={data}
          keyExtractor={(course) => course.id}
          renderItem={({ item }) => <CourseCard course={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
      paddingVertical: 10,
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerText: {
      margin: 0,
      fontSize: 22,
    },
    headerStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statText: {
      color: theme.colors.text,
    },
    listWrapper: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 24,
    },
    separator: {
      height: 16,
    },
  });
