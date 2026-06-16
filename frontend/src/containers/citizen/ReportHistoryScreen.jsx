import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import BottomNav from "../shared/BottomNav";
import ReportHistoryLoadingAnimation from "../shared/LoadingPage/ReportHistoryLoadingAnimation";
import api from "../../services/api";
import { issueStatusKey, issueStatusLabel } from "../../services/issuePresentation";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  red: "#EF4444",
};

const FILTERS = [
  { id: "day", label: "1 Day", days: 1, empty: "No reports in the last day." },
  { id: "week", label: "1 Week", days: 7, empty: "No reports in the last week." },
  { id: "month", label: "1 Month", days: 30, empty: "No reports in the last month." },
  { id: "all", label: "All Time", days: null, empty: "No report history yet." },
];

const STATUS_META = {
  pending: { label: "Submitted", color: C.orange, bg: "#FEF3E2", icon: "time-outline" },
  under_review: { label: "Being Assessed", color: C.orange, bg: "#FFF7ED", icon: "search-outline" },
  awaiting_funding: { label: "Funding Open", color: C.navy, bg: "#EFF6FF", icon: "heart-outline" },
  funded: { label: "Fully Funded", color: C.green, bg: "#ECFDF5", icon: "checkmark-circle-outline" },
  expired: { label: "Funding Ended", color: C.red, bg: "#FEF2F2", icon: "time-outline" },
  in_progress: { label: "In Progress", color: C.navy, bg: "#EFF6FF", icon: "sync-outline" },
  "in-progress": { label: "In Progress", color: C.navy, bg: "#EFF6FF", icon: "sync-outline" },
  resolved: { label: "Resolved", color: C.green, bg: "#ECFDF5", icon: "checkmark-circle-outline" },
  under_investigation: { label: "Under Review", color: C.orange, bg: "#FFF7ED", icon: "shield-outline" },
  rejected: { label: "Rejected", color: C.red, bg: "#FEF2F2", icon: "close-circle-outline" },
};

function getStatusMeta(issue) {
  return STATUS_META[issueStatusKey(issue)] || STATUS_META.pending;
}

function dateFromIssue(issue) {
  const parsed = new Date(issue.created_at);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatGroupDate(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPreview(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean || "No description provided.";
}

function withinFilter(issue, filter) {
  if (!filter.days) return true;

  const issueDate = dateFromIssue(issue);
  if (!issueDate) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (filter.days - 1));

  return issueDate >= start;
}

function buildHistoryRows(issues) {
  const rows = [];
  let currentGroup = "";

  issues.forEach((issue) => {
    const issueDate = dateFromIssue(issue);
    const groupLabel = issueDate ? formatGroupDate(issueDate) : "Unknown Date";

    if (groupLabel !== currentGroup) {
      currentGroup = groupLabel;
      rows.push({ type: "header", id: `header-${groupLabel}`, label: groupLabel });
    }

    rows.push({ type: "issue", id: `issue-${issue.id}`, issue, issueDate });
  });

  return rows;
}

const HistoryRow = ({ issue, issueDate, onPress }) => {
  const statusMeta = getStatusMeta(issue);

  return (
    <TouchableOpacity style={styles.historyRow} onPress={() => onPress(issue)} activeOpacity={0.82}>
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: statusMeta.color }]} />
        <View style={styles.timelineLine} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{issue.title}</Text>
          <Text style={styles.rowTime}>{issueDate ? formatTime(issueDate) : ""}</Text>
        </View>

        <Text style={styles.rowDesc} numberOfLines={2}>{formatPreview(issue.description)}</Text>

        <View style={styles.rowMeta}>
          <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={11} color={statusMeta.color} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{issueStatusLabel(issue)}</Text>
          </View>
          {!!issue.category && (
            <Text style={styles.metaText} numberOfLines={1}>{issue.category}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ReportHistoryScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState("week");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIssues = useCallback(async () => {
    try {
      const { data } = await api.get("/issues", { params: { mine: 1, sort: "newest" } });
      setIssues(data.data || []);
    } catch (error) {
      console.error("Failed to fetch report history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIssues();
    }, [fetchIssues])
  );

  const selectedFilter = FILTERS.find((filter) => filter.id === activeFilter) || FILTERS[1];

  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => withinFilter(issue, selectedFilter))
      .sort((a, b) => {
        const aDate = dateFromIssue(a)?.getTime() || 0;
        const bDate = dateFromIssue(b)?.getTime() || 0;
        return bDate - aDate;
      });
  }, [issues, selectedFilter]);

  const rows = useMemo(() => buildHistoryRows(filteredIssues), [filteredIssues]);

  const counts = useMemo(() => ({
    total: filteredIssues.length,
    resolved: filteredIssues.filter((issue) => issue.status === "resolved").length,
    active: filteredIssues.filter((issue) => ["pending", "under_review", "awaiting_funding", "funded", "in_progress", "in-progress"].includes(issueStatusKey(issue))).length,
  }), [filteredIssues]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIssues();
  }, [fetchIssues]);

  const openReport = (issue) => navigation.navigate("IssueDetails", { issue });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Report History</Text>
          <Text style={styles.subtitle}>Track your submitted reports by date.</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryValue}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Reports</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View>
          <Text style={[styles.summaryValue, { color: C.orange }]}>{counts.active}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View>
          <Text style={[styles.summaryValue, { color: C.green }]}>{counts.resolved}</Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const active = filter.id === activeFilter;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ReportHistoryLoadingAnimation />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.navy]}
              tintColor={C.navy}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.dateHeader}>{item.label}</Text>;
            }

            return (
              <HistoryRow
                issue={item.issue}
                issueDate={item.issueDate}
                onPress={openReport}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={34} color={C.border} />
              </View>
              <Text style={styles.emptyTitle}>Nothing here</Text>
              <Text style={styles.emptyHint}>{selectedFilter.empty}</Text>
            </View>
          }
        />
      )}

      <BottomNav navigation={navigation} activeTab="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 23, fontWeight: "900", color: C.navy },
  subtitle: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  summaryValue: { color: C.navy, fontSize: 22, fontWeight: "900", textAlign: "center" },
  summaryLabel: { color: C.muted, fontSize: 11, fontWeight: "800", marginTop: 2, textAlign: "center" },
  summaryDivider: { width: 1, height: 34, backgroundColor: C.border },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  filterPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterText: { color: C.muted, fontSize: 11, fontWeight: "900" },
  filterTextActive: { color: "#FFFFFF" },
  listContent: { paddingHorizontal: 18, paddingBottom: 110 },
  dateHeader: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  historyRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  timeline: { alignItems: "center", width: 18, marginRight: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineLine: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 5 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTitle: { flex: 1, color: C.text, fontSize: 14, fontWeight: "900" },
  rowTime: { color: C.muted, fontSize: 11, fontWeight: "800" },
  rowDesc: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: "900" },
  metaText: { flex: 1, color: C.muted, fontSize: 11, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingTop: 70, gap: 10 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: "900" },
  emptyHint: { color: C.muted, fontSize: 13, fontWeight: "700", textAlign: "center" },
});
