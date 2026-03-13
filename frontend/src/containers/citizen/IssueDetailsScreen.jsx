import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function IssueDetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Issue Details</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 22, fontWeight: "700" },
});