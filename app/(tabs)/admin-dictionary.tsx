import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";

import { useAppSelector } from "@core/store/hooks";
import { selectIsAdmin } from "@entities/user/model/selectors";
import AdminDictionaryScreen from "@features/admin/screens/AdminDictionaryScreen";

export default function AdminDictionaryRoute() {
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.denied}>Доступно только администратору</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AdminDictionaryScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  denied: { fontSize: 16, color: "#666" },
});
