import { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-audio";
import { useTheme } from "styled-components/native";

import { useAppDispatch, useAppSelector } from "@core/store/hooks";
import { useRouter } from "expo-router";
import { Typography, SurfaceCard, Input } from "@shared/ui";
import {
  fetchUserDictionary,
  removeUserDictionaryEntry,
  selectDictionaryItems,
  selectDictionaryStatus,
} from "@features/dictionary/model/dictionarySlice";

export default function ProfileScreen() {
  const profile = useAppSelector((s) => s.user.profile);
  const dictionaryItems = useAppSelector(selectDictionaryItems);
  const dictionaryStatus = useAppSelector(selectDictionaryStatus);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const theme = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (profile?.id && dictionaryStatus === "idle") {
      dispatch(fetchUserDictionary({ userId: profile.id }));
    }
  }, [profile?.id, dictionaryStatus, dispatch]);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const handlePlayAudio = async (
    audioUrl: string | undefined,
    wordId: string
  ) => {
    if (!audioUrl) {
      return;
    }

    try {
      if (playingId === wordId && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
        return;
      }

      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(wordId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });

      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingId(null);
    }
  };

  const handleRemoveWord = (wordId: string) => {
    if (profile?.id) {
      dispatch(removeUserDictionaryEntry({ userId: profile.id, id: wordId }));
    }
  };

  const handleOpenSettings = () => {
    router.push("/settings");
  };

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return dictionaryItems;

    return dictionaryItems.filter((item) => {
      const word = item.word.toLowerCase();
      const translation = item.translation.toLowerCase();
      return word.includes(query) || translation.includes(query);
    });
  }, [dictionaryItems, searchTerm]);

  const hasDictionaryItems = dictionaryItems.length > 0;
  const hasSearchResults = filteredItems.length > 0;
  const styles = getStyles(theme);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    wordId: string
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[styles.swipeActions, { transform: [{ translateX }] }]}
      >
        <TouchableOpacity
          onPress={() => handleRemoveWord(wordId)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Typography variant="title" style={styles.title}>
            {" "}
          </Typography>
          <Typography variant="title" style={styles.title}>
            {"Профиль"}
          </Typography>
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={styles.settingsButton}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {profile ? (
              <SurfaceCard style={styles.profileCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userIdentity}>
                    <Typography variant="subtitle" style={styles.userName}>
                      {profile.fullName}
                    </Typography>
                    <Typography variant="body" style={styles.userEmail}>
                      {profile.email}
                    </Typography>
                  </View>
                  <View style={styles.levelBadge}>
                    <Typography variant="caption" style={styles.levelText}>
                      {profile.level}
                    </Typography>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="trophy-outline" size={24} color="#F59E0B" />
                    <Typography variant="body" style={styles.statValue}>
                      {profile.xpPoints} XP
                    </Typography>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="flame-outline" size={24} color="#EF4444" />
                    <Typography variant="body" style={styles.statValue}>
                      {profile.streakDays}{" "}
                      {profile.streakDays === 1
                        ? "день"
                        : profile.streakDays >= 2 && profile.streakDays <= 4
                        ? "дня"
                        : "дней"}
                    </Typography>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={24}
                      color="#10B981"
                    />
                    <Typography variant="body" style={styles.statValue}>
                      {profile.completedLessons} уроков
                    </Typography>
                  </View>
                </View>
              </SurfaceCard>
            ) : (
              <Typography variant="body" style={styles.note}>
                {"Авторизуйтесь, чтобы увидеть данные профиля"}
              </Typography>
            )}

            <SurfaceCard style={styles.dictionaryCard}>
              <Typography variant="subtitle" style={styles.dictionaryTitle}>
                {"Мой словарь"}
              </Typography>
              {dictionaryStatus === "loading" ? (
                <Typography variant="body" style={styles.note}>
                  {"Загружаем..."}
                </Typography>
              ) : (
                <View style={styles.dictionaryContent}>
                  {hasDictionaryItems && (
                    <Input
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      placeholder="Введите слово или перевод"
                      autoCapitalize="none"
                    />
                  )}
                  {!hasDictionaryItems ? (
                    <Typography variant="body" style={styles.note}>
                      {
                        "Словарь пока пуст. Добавьте новое слово через чтение или упражнения."
                      }
                    </Typography>
                  ) : !hasSearchResults ? (
                    <Typography variant="body" style={styles.note}>
                      {"Совпадений не найдено."}
                    </Typography>
                  ) : (
                    <View style={styles.wordsList}>
                      {filteredItems.map((item) => {
                        const translations = item.translation
                          .split(",")
                          .map((t) => t.trim());
                        const mainTranslation = translations[0];
                        const otherTranslations = translations
                          .slice(1)
                          .join(", ");

                        return (
                          <Swipeable
                            key={item.id}
                            renderRightActions={(progress, dragX) =>
                              renderRightActions(progress, dragX, item.id)
                            }
                            overshootRight={false}
                          >
                            <View style={styles.wordItem}>
                              <View style={styles.wordContent}>
                                <Typography
                                  variant="body"
                                  style={styles.wordText}
                                >
                                  {item.word}
                                </Typography>
                                <Typography
                                  variant="body"
                                  style={styles.mainTranslation}
                                >
                                  {mainTranslation}
                                </Typography>
                                {otherTranslations && (
                                  <Typography
                                    variant="caption"
                                    style={styles.otherTranslations}
                                  >
                                    {otherTranslations}
                                  </Typography>
                                )}
                              </View>
                              {item.audioUrl && (
                                <TouchableOpacity
                                  onPress={() =>
                                    handlePlayAudio(item.audioUrl, item.id)
                                  }
                                  style={styles.audioButton}
                                >
                                  <Ionicons
                                    name={
                                      playingId === item.id
                                        ? "pause-circle"
                                        : "volume-medium"
                                    }
                                    size={26}
                                    color="#3B82F6"
                                  />
                                </TouchableOpacity>
                              )}
                            </View>
                          </Swipeable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </SurfaceCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
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
    },
    title: {
      margin: 0,
      fontSize: 22,
    },
    settingsButton: {
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
      gap: 16,
    },
    userInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
    },
    userIdentity: {
      flex: 1,
      gap: 4,
    },
    userName: {
      color: theme.colors.text,
    },
    userEmail: {
      color: theme.colors.textSecondary,
    },
    levelBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
    },
    levelText: {
      color: theme.colors.onPrimary,
      fontWeight: "600",
    },
    statsRow: {
      flexDirection: "row",
      gap: 24,
      flexWrap: "wrap",
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statValue: {
      fontWeight: "600",
      color: theme.colors.text,
    },
    dictionaryCard: {
      marginBottom: 16,
      gap: 16,
    },
    dictionaryTitle: {
      marginBottom: 16,
    },
    dictionaryContent: {
      gap: 16,
    },
    wordsList: {
      gap: 12,
    },
    wordItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    wordContent: {
      flex: 1,
      gap: 4,
    },
    wordText: {
      fontWeight: "700",
      fontSize: 16,
      color: theme.colors.text,
    },
    audioButton: {
      padding: 8,
      marginLeft: 8,
    },
    swipeActions: {
      justifyContent: "center",
      alignItems: "flex-end",
      width: 80,
    },
    deleteButton: {
      backgroundColor: theme.colors.danger,
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      height: "100%",
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    mainTranslation: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    otherTranslations: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      opacity: 0.7,
    },
    note: {
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
  });
