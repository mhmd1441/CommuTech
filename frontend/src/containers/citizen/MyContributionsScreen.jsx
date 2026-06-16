import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import BottomNav from "../shared/BottomNav";
import { issueApi } from "../../services/api";
import { issueStatusLabel, money } from "../../services/issuePresentation";

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
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "refunded", label: "Refunded" },
];

function donationDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyContributionsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const loadContributions = useCallback(async () => {
    try {
      const data = await issueApi.contributions();
      setDonations(data.data || []);
    } catch {
      setDonations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContributions();
    }, [loadContributions])
  );

  const filtered = useMemo(() => {
    if (activeFilter === "all") return donations;
    return donations.filter((donation) => donation.status === activeFilter);
  }, [activeFilter, donations]);

  const totalConfirmed = donations
    .filter((donation) => donation.status === "confirmed")
    .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

  const refresh = () => {
    setRefreshing(true);
    loadContributions();
  };

  const renderDonation = ({ item }) => {
    const issue = item.issue || {};
    const refunded = item.status === "refunded";

    return (
      <Pressable
        style={styles.card}
        onPress={() => issue.id && navigation.navigate("IssueDetails", { issue })}
      >
        <View style={[styles.iconWrap, { backgroundColor: refunded ? "#FEF2F2" : "#ECFDF5" }]}>
          <Ionicons
            name={refunded ? "return-down-back-outline" : "heart-outline"}
            size={20}
            color={refunded ? C.red : C.green}
          />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{issue.title || "Community contribution"}</Text>
            <Text style={[styles.amount, { color: refunded ? C.red : C.green }]}>{money(item.amount)}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>{issueStatusLabel(issue)} • {donationDate(item.created_at)}</Text>
          <Text style={styles.description} numberOfLines={2}>{issue.location || "Location unavailable"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Contributions</Text>
          <Text style={styles.headerSub}>{money(totalConfirmed)} currently supporting community repairs</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.navy} />
          <Text style={styles.loadingText}>Loading contributions...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDonation}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.navy} colors={[C.navy]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={34} color={C.border} />
              <Text style={styles.emptyTitle}>No contributions here</Text>
              <Text style={styles.emptyText}>Community funding activity will appear here.</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
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
  headerTitle: { color: C.navy, fontSize: 22, fontWeight: "900" },
  headerSub: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: C.navy, borderColor: C.navy },
  tabText: { color: C.muted, fontWeight: "800", fontSize: 12 },
  tabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 20, paddingBottom: 105, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    backgroundColor: C.card,
    padding: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: C.text, fontWeight: "900", fontSize: 14 },
  amount: { fontWeight: "900", fontSize: 14 },
  meta: { color: C.muted, fontSize: 12, fontWeight: "800", marginTop: 4 },
  description: { color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 4 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: C.muted, fontWeight: "800" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 70, gap: 8 },
  emptyTitle: { color: C.text, fontWeight: "900" },
  emptyText: { color: C.muted, fontWeight: "700" },
});
