import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lessons/create" />
      <Stack.Screen name="lessons/[id]/edit" />
      <Stack.Screen name="lessons/[id]/preview" />
    </Stack>
  );
}
