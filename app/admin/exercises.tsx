import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text } from "react-native";

import { useAppSelector } from "@core/store/hooks";
import { selectIsAdmin } from "@entities/user/model/selectors";
import AdminExercisesScreen from "@features/admin/screens/AdminExercisesScreen";

export default function AdminExercisesRoute() {
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.denied}>Доступно только администратору</Text>
      </SafeAreaView>
    );
  }

  return <AdminExercisesScreen />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  denied: { fontSize: 16, color: "#666" },
});
