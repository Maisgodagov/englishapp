import { useMemo, useRef } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import { Trophy, Flame } from "lucide-react-native";

import { useAppSelector } from "@core/store/hooks";
import { Typography } from "@shared/ui";
import { useWordLookup } from "@shared/word-lookup/WordLookupProvider";

export default function HomeScreen() {
  const theme = useTheme();
  const profile = useAppSelector((s) => s.user.profile);
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { open } = useWordLookup();
  const buttonRef = useRef<View>(null);

  const testWordLookup = () => {
    (buttonRef.current as any)?.measureInWindow(
      (x: number, y: number, w: number, h: number) => {
        // Якорь в центре снизу кнопки
        open("test", { x: x + w / 2, y: y + h });
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        {profile && (
          <View style={styles.statItem}>
            <Trophy size={22} color="#F59E0B" />
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
            <Flame size={22} color="#EF4444" />
            <Typography variant="body" style={styles.statValue}>
              {profile.streakDays}
            </Typography>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Typography variant="title" align="center">
            Главная страница
          </Typography>

          <TouchableOpacity
            ref={buttonRef}
            onPress={testWordLookup}
            style={{ padding: 20, backgroundColor: theme.colors.primary, borderRadius: 8 }}
          >
            <Typography variant="body" style={{ color: "#FFF" }}>
              Тест поповера (нажми)
            </Typography>
          </TouchableOpacity>

          <Typography
            enableWordLookup
            variant="body"
            align="center"
            style={styles.placeholder}
          >
            test for know if fuck,
          </Typography>
          <Typography
            enableWordLookup
            variant="body"
            align="center"
            style={styles.placeholder}
          >
            test" 349г @ ofjo"£$%&9 0934 for know if fuck,
          </Typography>
          <Typography
            enableWordLookup
            variant="body"
            align="center"
            style={styles.placeholder}
          >
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nostrum
            esse fugit officiis, expedita amet quisquam aut adipisci assumenda
            laudantium maiores minima doloremque soluta libero dolore voluptas
            debitis mollitia incidunt voluptates?
          </Typography>
          <Typography
            enableWordLookup
            variant="body"
            align="center"
            style={styles.placeholder}
          >
            don't ask and dont talk just shut your bitch ass up
          </Typography>
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
      fontSize: 14,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 20,
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    placeholder: {
      color: theme.colors.textSecondary,
    },
  });
