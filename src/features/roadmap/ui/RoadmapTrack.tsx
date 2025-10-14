import { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Line } from "react-native-svg";

import { Typography } from "@shared/ui";
import {
  LessonProgressStatus,
  lessonProgressColors,
} from "@shared/constants/lessonProgress";

import type { RoadmapModule, RoadmapLesson } from "../model/types";

interface RoadmapTrackProps {
  modules: RoadmapModule[];
}

const FALLBACK_ICON = "⭐";

export const RoadmapTrack = memo(({ modules }: RoadmapTrackProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.wrapper}>
      {modules.map((module) => (
        <View key={module.id} style={styles.module}>
          {/* Заголовок модуля */}
          <View style={styles.moduleHeader}>
            <View style={styles.dashedLine}>
              <Svg width="100%" height="2">
                <Line
                  x1="0"
                  y1="1"
                  x2="100%"
                  y2="1"
                  stroke={theme.colors.border}
                  strokeWidth="2"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Typography variant="title" style={styles.moduleTitle}>
              {module.title}
            </Typography>
            <View style={styles.dashedLine}>
              <Svg width="100%" height="2">
                <Line
                  x1="0"
                  y1="1"
                  x2="100%"
                  y2="1"
                  stroke={theme.colors.border}
                  strokeWidth="2"
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          {/* Список уроков */}
          <View style={styles.lessonsTrack}>
            {module.lessons.map((lesson) => (
              <LessonNode
                key={lesson.id}
                lesson={lesson}
                styles={styles}
                theme={theme}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
});

RoadmapTrack.displayName = "RoadmapTrack";

interface LessonNodeProps {
  lesson: RoadmapLesson;
  styles: ReturnType<typeof getStyles>;
  theme: any;
}

const LessonNode = ({ lesson, styles, theme }: LessonNodeProps) => {
  const color = lessonProgressColors[lesson.status];
  const isLocked = lesson.status === LessonProgressStatus.LOCKED;
  const isCompleted = lesson.status === LessonProgressStatus.COMPLETED;
  const showStars =
    lesson.status === LessonProgressStatus.COMPLETED || lesson.stars > 0;

  return (
    <View
      style={[
        styles.lessonCard,
        {
          borderColor: color,
          backgroundColor: lesson.isCurrent
            ? color + "15"
            : styles.lessonCard.backgroundColor,
        },
        isLocked && styles.lessonCardLocked,
      ]}
    >
      <View style={styles.lessonHeader}>
        <View style={[styles.lessonBadge, { borderColor: color }]}>
          <Typography variant="title" style={styles.lessonBadgeText}>
            {lesson.icon && lesson.icon.trim().length > 0
              ? lesson.icon
              : FALLBACK_ICON}
          </Typography>
        </View>
        <View style={styles.lessonInfo}>
          <Typography variant="subtitle" style={styles.lessonTitle}>
            {lesson.title}
          </Typography>
          {lesson.description && (
            <Typography variant="body" style={styles.lessonDescription}>
              {lesson.description}
            </Typography>
          )}
        </View>
        {/* Иконка статуса */}
        <View
          style={[
            styles.statusIcon,
            {
              backgroundColor: theme.colors.surface,
              borderColor: color,
            },
          ]}
        >
          <Ionicons
            name={
              isLocked
                ? "lock-closed"
                : isCompleted
                ? "checkmark"
                : lesson.status === LessonProgressStatus.IN_PROGRESS
                ? "play"
                : "star"
            }
            color={color}
            size={16}
          />
        </View>
      </View>
      <View style={styles.lessonMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="flash" size={12} color="#F59E0B" />
          <Typography variant="caption" style={styles.metaText}>
            {lesson.xpReward} XP
          </Typography>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="bar-chart" size={12} color="#6366F1" />
          <Typography variant="caption" style={styles.metaText}>
            Lv.{lesson.difficulty}
          </Typography>
        </View>
        {showStars && (
          <View style={styles.metaItem}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Typography variant="caption" style={styles.metaText}>
              {lesson.stars}/3
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
};


const getStyles = (theme: any) =>
  StyleSheet.create({
    wrapper: {
      gap: 32,
      paddingBottom: 40,
    },
    module: {
      gap: 16,
    },
    moduleHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 4,
    },
    dashedLine: {
      flex: 1,
      height: 2,
    },
    moduleTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
    },
    lessonsTrack: {
      gap: 12,
    },
    lessonCard: {
      width: "100%",
      borderRadius: 18,
      borderWidth: 2,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 9,
      elevation: 2,
    },
    lessonCardLocked: {
      opacity: 0.55,
    },
    lessonHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    lessonBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    lessonBadgeText: {
      fontSize: 22,
      fontWeight: "700",
    },
    lessonInfo: {
      flex: 1,
      gap: 4,
    },
    lessonTitle: {
      fontWeight: "600",
      fontSize: 15,
    },
    lessonDescription: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    statusIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 2,
    },
    lessonMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    metaText: {
      fontWeight: "600",
      color: theme.colors.text,
      fontSize: 11,
    },
  });
