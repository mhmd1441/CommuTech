import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = {
  navy: "#19405F",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  muted: "#64748B",
  border: "#E2E8F0",
  soft: "#EEF3F8",
};

const SKELETON_CARDS = [0, 1, 2];

export default function ReportsLoadingAnimation() {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      <View style={styles.loadingHeader}>
        <View style={styles.iconBox}>
          <Ionicons name="document-text-outline" size={18} color={C.navy} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Loading your reports</Text>
          <Text style={styles.subtitle}>Fetching your latest report activity.</Text>
        </View>
      </View>

      {SKELETON_CARDS.map((item) => (
        <Animated.View key={item} style={[styles.card, { opacity }]}>
          <View style={styles.accent} />
          <View style={styles.imageBlock} />
          <View style={styles.body}>
            <View style={styles.row}>
              <View style={[styles.line, styles.titleLine]} />
              <View style={[styles.line, styles.badgeLine]} />
            </View>
            <View style={[styles.line, styles.fullLine]} />
            <View style={[styles.line, styles.mediumLine]} />
            <View style={styles.footerRow}>
              <View style={[styles.line, styles.locationLine]} />
              <View style={[styles.line, styles.dateLine]} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.navy + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: C.navy,
    fontSize: 13,
    fontWeight: "900",
  },
  subtitle: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: {
    width: 4,
    backgroundColor: C.border,
  },
  imageBlock: {
    width: 86,
    minHeight: 110,
    backgroundColor: C.soft,
  },
  body: {
    flex: 1,
    padding: 10,
    gap: 7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  line: {
    height: 11,
    borderRadius: 999,
    backgroundColor: C.border,
  },
  titleLine: {
    flex: 1,
    height: 13,
  },
  badgeLine: {
    width: 58,
    height: 18,
  },
  fullLine: {
    width: "92%",
  },
  mediumLine: {
    width: "70%",
  },
  locationLine: {
    width: "38%",
  },
  dateLine: {
    width: "22%",
  },
});
