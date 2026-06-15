import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const C = {
  navy: "#19405F",
  card: "#FFFFFF",
  muted: "#64748B",
  border: "#E2E8F0",
  soft: "#EEF3F8",
};

const ROWS = [0, 1, 2, 3];

export default function ReportHistoryLoadingAnimation() {
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
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Preparing report history</Text>
        <View style={styles.headerLine} />
      </View>

      {ROWS.map((row, index) => (
        <Animated.View key={row} style={[styles.row, { opacity }]}>
          <View style={styles.timeline}>
            <View style={styles.timelineDot} />
            {index < ROWS.length - 1 && <View style={styles.timelineLine} />}
          </View>

          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={[styles.line, styles.titleLine]} />
              <View style={[styles.line, styles.timeLine]} />
            </View>
            <View style={[styles.line, styles.descLine]} />
            <View style={[styles.line, styles.shortLine]} />
            <View style={styles.metaRow}>
              <View style={styles.statusPill} />
              <View style={[styles.line, styles.categoryLine]} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  headerTitle: {
    color: C.navy,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  row: {
    flexDirection: "row",
    minHeight: 104,
  },
  timeline: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.navy,
    marginTop: 18,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.border,
    marginTop: 6,
  },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    marginLeft: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  line: {
    height: 11,
    borderRadius: 999,
    backgroundColor: C.soft,
  },
  titleLine: {
    flex: 1,
    height: 13,
  },
  timeLine: {
    width: 44,
  },
  descLine: {
    width: "90%",
    marginTop: 12,
  },
  shortLine: {
    width: "64%",
    marginTop: 8,
  },
  statusPill: {
    width: 78,
    height: 24,
    borderRadius: 10,
    backgroundColor: C.soft,
  },
  categoryLine: {
    width: "36%",
  },
});
