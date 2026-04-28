import React from "react";
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  red: "#B91C1C",
};

const FALLBACK_ISSUE = {
  title: "Traffic light not working",
  priority: "Critical",
  status: "Pending",
  description:
    "The traffic light at the intersection has stopped working since morning and is causing traffic confusion.",
  location: "Beirut, Hamra",
  date: "Today",
  category: "Traffic",
  image:
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop",
};

function statusColor(status) {
  if (status === "Done" || status === "Resolved") return C.green;
  if (status === "In Progress" || status === "in-progress") return C.orange;
  if (status === "Rejected" || status === "rejected") return C.red;
  return C.navy;
}

function priorityColor(priority) {
  if (priority === "Critical" || priority === "high") return C.red;
  if (priority === "High" || priority === "medium") return C.orange;
  return C.navy;
}

export default function IssueDetailsScreen({ navigation, route }) {
  const issue = { ...FALLBACK_ISSUE, ...(route?.params?.issue || {}) };
  const status = issue.status === "in-progress" ? "In Progress" : issue.status || "Pending";
  const priority = issue.priority === "high" ? "High" : issue.priority || "Medium";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={C.navy} />
          </Pressable>
          <Text style={styles.headerTitle}>Issue Details</Text>
          <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={C.navy} />
          </Pressable>
        </View>

        <Image source={{ uri: issue.image }} style={styles.heroImage} />

        <View style={styles.card}>
          <View style={styles.metaRow}>
            <View style={[styles.pill, { backgroundColor: statusColor(status) + "18" }]}>
              <Text style={[styles.pillText, { color: statusColor(status) }]}>{status}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: priorityColor(priority) + "18" }]}>
              <Text style={[styles.pillText, { color: priorityColor(priority) }]}>
                {priority}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.description}>{issue.description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={18} color={C.navy} />
              <View>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{issue.category || "General"}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={C.navy} />
              <View>
                <Text style={styles.infoLabel}>Reported</Text>
                <Text style={styles.infoValue}>{issue.date || "Today"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.locationBox}>
            <Ionicons name="location-outline" size={20} color={C.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{issue.location || "Location unavailable"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Routing Timeline</Text>
          {[
            ["Report submitted", "Citizen report stored with photo and location.", true],
            ["AI triage", "Text, image, and location scoring will run here later.", true],
            ["Supervisor review", "Admin validates and assigns a worker.", status !== "Pending"],
            ["Worker proof", "Worker uploads final proof after repair.", status === "Done"],
          ].map(([title, body, done], index) => (
            <View key={title} style={styles.timelineRow}>
              <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                <Text style={styles.timelineNumber}>{index + 1}</Text>
              </View>
              <View style={styles.timelineText}>
                <Text style={styles.timelineTitle}>{title}</Text>
                <Text style={styles.timelineBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MyReports")}>
            <Text style={styles.secondaryText}>My Reports</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CreateIssue")}>
            <Text style={styles.primaryText}>New Report</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: C.navy, fontWeight: "900" },
  heroImage: { width: "100%", height: 220, borderRadius: 20, backgroundColor: C.border },
  card: {
    marginTop: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
  },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "900" },
  title: { fontSize: 22, fontWeight: "900", color: C.text, lineHeight: 28 },
  description: { marginTop: 10, color: C.muted, fontWeight: "600", lineHeight: 21 },
  infoGrid: { flexDirection: "row", gap: 10, marginTop: 16 },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
  },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: "800" },
  infoValue: { marginTop: 2, color: C.text, fontWeight: "900" },
  locationBox: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "900", marginBottom: 12 },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 9 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: { backgroundColor: C.navy },
  timelineNumber: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  timelineText: { flex: 1 },
  timelineTitle: { color: C.text, fontWeight: "900" },
  timelineBody: { marginTop: 3, color: C.muted, fontWeight: "600", lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: C.navy, fontWeight: "900" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
});
