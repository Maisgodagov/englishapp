import { Tabs } from "expo-router";
import { Home, Book, Film, User } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Home size={28} color={color} fill="none" />
          ),
        }}
      />
      <Tabs.Screen
        name="video-dictionary"
        options={{
          title: "Видеословарь",
          tabBarIcon: ({ color }) => (
            <Book size={28} color={color} fill="none" />
          ),
        }}
      />
      <Tabs.Screen
        name="video-learning"
        options={{
          title: "Video",
          tabBarIcon: ({ color }) => (
            <Film size={28} color={color} fill="none" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <User size={28} color={color} fill="none" />
          ),
        }}
      />
    </Tabs>
  );
}
