import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Callout, Circle, Marker } from "react-native-maps";
import api from "../../services/api";

const COLORS = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#B91C1C",
  blue: "#2563EB",
  softBlue: "#EAF1F7",
};

const RADIUS_METERS = 1000;
const RADIUS_LABEL = "1 km";

const DEFAULT_REGION = {
  latitude: 33.8938,
  longitude: 35.5018,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export default function WorkerHomeScreen({ navigation }) {
  const [viewMode, setViewMode] = useState("map");
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [workerRegion, setWorkerRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const { height } = useWindowDimensions();
  const mapHeight = Math.max(420, height - 285);
  const mapRef = useRef(null);

  const activeRegion = workerRegion || DEFAULT_REGION;

  const loadWorkerIssues = useCallback(async () => {
    try {
      setLoading(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location Needed", "Worker mode needs location permission to show nearby unassigned issues.");
        setWorkerRegion(DEFAULT_REGION);
        const assignedResponse = await api.get("/worker/issues/assigned");
        setAssignedIssues(assignedResponse.data.data || []);
        setNearbyIssues([]);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      };

      setWorkerRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 700);

      const [assignedResponse, nearbyResponse] = await Promise.all([
        api.get("/worker/issues/assigned"),
        api.get("/worker/issues/nearby", {
          params: {
            latitude: nextRegion.latitude,
            longitude: nextRegion.longitude,
            radius: RADIUS_METERS,
          },
        }),
      ]);

      setAssignedIssues(assignedResponse.data.data || []);
      setNearbyIssues(nearbyResponse.data.data || []);
    } catch (error) {
      console.error("Failed to load worker issues:", error);
      Alert.alert("Worker Mode", error.message || "Could not load worker issues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkerIssues();
    }, [loadWorkerIssues])
  );

  const mapIssues = useMemo(() => {
    return nearbyIssues
      .map((issue) => ({
        ...issue,
        coords:
          issue.latitude && issue.longitude
            ? { latitude: parseFloat(issue.latitude), longitude: parseFloat(issue.longitude) }
            : null,
      }))
      .filter((issue) => issue.coords);
  }, [nearbyIssues]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return COLORS.danger;
      case "high":
        return COLORS.orange;
      case "medium":
        return COLORS.blue;
      default:
        return COLORS.navy;
    }
  };

  const PriorityLegend = () => (
    <View style={styles.legendRow}>
      {["critical", "high", "medium", "low"].map((priority) => (
        <View key={priority} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getPriorityColor(priority) }]} />
          <Text style={styles.legendText}>{priority}</Text>
        </View>
      ))}
    </View>
  );

  const assignToMe = async (issue) => {
    try {
      setAssigningId(issue.id);
      await api.patch(`/worker/issues/${issue.id}/assign-to-me`);
      await loadWorkerIssues();
    } catch (error) {
      Alert.alert("Assign Issue", error.message || "Could not assign this issue.");
    } finally {
      setAssigningId(null);
    }
  };

  const markResolved = async (issue) => {
    try {
      await api.patch(`/worker/issues/${issue.id}/status`, { status: "resolved" });
      await loadWorkerIssues();
    } catch (error) {
      Alert.alert("Update Issue", error.message || "Could not update this issue.");
    }
  };

  const IssueCard = ({ issue, assigned }) => (
    <View style={styles.issueCard}>
      <View style={[styles.priorityLine, { backgroundColor: getPriorityColor(issue.priority) }]} />
      <View style={styles.issueBody}>
        <View style={styles.issueTop}>
          <Text style={styles.issueTitle} numberOfLines={1}>
            {issue.title}
          </Text>
          <Text style={[styles.priorityPill, { color: getPriorityColor(issue.priority), borderColor: getPriorityColor(issue.priority) }]}>
            {issue.priority}
          </Text>
        </View>
        <Text style={styles.issueMeta} numberOfLines={1}>
          {issue.category} - {issue.location}
        </Text>
        <Text style={styles.issueDescription} numberOfLines={2}>
          {issue.description}
        </Text>
        <View style={styles.issueActions}>
          {assigned ? (
            <Pressable onPress={() => markResolved(issue)} style={[styles.actionBtn, styles.resolveBtn]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>Mark Resolved</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => assignToMe(issue)}
              disabled={assigningId === issue.id}
              style={[styles.actionBtn, assigningId === issue.id && { opacity: 0.55 }]}
            >
              <Ionicons name="briefcase-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>{assigningId === issue.id ? "Assigning..." : "Assign to me"}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.modePill}>
              <Ionicons name="construct-outline" size={14} color={COLORS.navy} />
              <Text style={styles.modePillText}>Field Operations</Text>
            </View>
            <Text style={styles.brand}>Worker Mode</Text>
            <Text style={styles.headerSub}>Assigned work and unassigned reports near you</Text>
          </View>
          <Pressable
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "CitizenHome" }] })}
            style={styles.citizenBtn}
          >
            <Ionicons name="person-outline" size={18} color={COLORS.navy} />
            <Text style={styles.citizenText}>Citizen</Text>
          </Pressable>
        </View>

        <View style={styles.segmentWrap}>
          <Pressable
            onPress={() => setViewMode("map")}
            style={[styles.segmentBtn, viewMode === "map" && styles.segmentBtnActive]}
          >
            <Ionicons name="map-outline" size={18} color={viewMode === "map" ? "#fff" : COLORS.navy} />
            <Text style={[styles.segmentText, viewMode === "map" && styles.segmentTextActive]}>Map View</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("list")}
            style={[styles.segmentBtn, viewMode === "list" && styles.segmentBtnActive]}
          >
            <Ionicons name="list-outline" size={18} color={viewMode === "list" ? "#fff" : COLORS.navy} />
            <Text style={[styles.segmentText, viewMode === "list" && styles.segmentTextActive]}>List View</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Ionicons name="clipboard-outline" size={18} color={COLORS.navy} />
            <Text style={styles.summaryValue}>{assignedIssues.length}</Text>
            <Text style={styles.summaryLabel}>Assigned</Text>
          </View>
          <View style={styles.summaryBox}>
            <Ionicons name="locate-outline" size={18} color={COLORS.orange} />
            <Text style={styles.summaryValue}>{nearbyIssues.length}</Text>
            <Text style={styles.summaryLabel}>Unassigned Nearby</Text>
          </View>
          <View style={styles.summaryBox}>
            <Ionicons name="radio-button-on-outline" size={18} color={COLORS.green} />
            <Text style={styles.summaryValue}>{RADIUS_LABEL}</Text>
            <Text style={styles.summaryLabel}>Radius</Text>
          </View>
        </View>

        <PriorityLegend />

        {loading ? (
          <View style={[styles.loadingBox, { height: mapHeight }]}>
            <ActivityIndicator size="large" color={COLORS.navy} />
            <Text style={styles.loadingText}>Loading worker issues...</Text>
          </View>
        ) : viewMode === "map" ? (
          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              style={{ height: mapHeight, borderRadius: 16 }}
              initialRegion={activeRegion}
              showsUserLocation
              showsMyLocationButton
              onMapReady={() => mapRef.current?.animateToRegion(activeRegion, 500)}
            >
              <Circle
                center={{ latitude: activeRegion.latitude, longitude: activeRegion.longitude }}
                radius={RADIUS_METERS}
                strokeColor="rgba(25, 64, 95, 0.45)"
                fillColor="rgba(25, 64, 95, 0.12)"
              />
              {mapIssues.map((issue) => (
                <Marker
                  key={issue.id}
                  coordinate={issue.coords}
                  pinColor={getPriorityColor(issue.priority)}
                >
                  <Callout onPress={() => assignToMe(issue)}>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle} numberOfLines={1}>
                        {issue.title}
                      </Text>
                      <Text style={styles.calloutMeta}>{issue.category}</Text>
                      <Text style={[styles.calloutPriority, { color: getPriorityColor(issue.priority) }]}>
                        {issue.priority?.toUpperCase()}
                      </Text>
                      <Text style={styles.calloutTap}>Tap to assign to me</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
            <View style={styles.mapFooter}>
              <Text style={styles.mapFooterText}>Only unassigned pending issues are shown</Text>
              <Text style={styles.mapFooterText}>{RADIUS_LABEL} radius</Text>
            </View>
          </View>
        ) : (
          <View style={styles.listWrap}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Assigned to me</Text>
              <Text style={styles.sectionCount}>{assignedIssues.length}</Text>
            </View>
            {assignedIssues.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-done-outline" size={24} color={COLORS.green} />
                <Text style={styles.emptyText}>No assigned issues yet.</Text>
              </View>
            ) : (
              assignedIssues.map((issue) => <IssueCard key={issue.id} issue={issue} assigned />)
            )}

            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <Text style={styles.sectionTitle}>Unassigned nearby</Text>
              <Text style={styles.sectionCount}>{nearbyIssues.length}</Text>
            </View>
            {nearbyIssues.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="map-outline" size={24} color={COLORS.muted} />
                <Text style={styles.emptyText}>No unassigned issues inside your radius.</Text>
              </View>
            ) : (
              nearbyIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 32 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  modePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.softBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  modePillText: { color: COLORS.navy, fontWeight: "900", fontSize: 11 },
  brand: { fontSize: 26, fontWeight: "900", color: COLORS.text },
  headerSub: { marginTop: 4, color: COLORS.muted, fontWeight: "700", maxWidth: 230 },
  citizenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softBlue,
  },
  citizenText: { color: COLORS.navy, fontWeight: "900" },
  segmentWrap: {
    marginTop: 18,
    flexDirection: "row",
    backgroundColor: "#EEF3F8",
    borderRadius: 16,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  segmentBtnActive: { backgroundColor: COLORS.navy },
  segmentText: { color: COLORS.navy, fontWeight: "800" },
  segmentTextActive: { color: "#fff" },
  summaryRow: { flexDirection: "row", gap: 10, marginVertical: 16 },
  summaryBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
  },
  summaryValue: { color: COLORS.text, fontWeight: "900", fontSize: 18, marginTop: 8 },
  summaryLabel: { marginTop: 4, color: COLORS.muted, fontWeight: "700", fontSize: 11 },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.muted, fontWeight: "800", fontSize: 11, textTransform: "capitalize" },
  loadingBox: { borderRadius: 16, backgroundColor: "#EAF1F7", alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: COLORS.muted, fontWeight: "700" },
  mapCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  mapFooter: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  mapFooterText: { flex: 1, fontSize: 12, color: COLORS.muted, fontWeight: "800" },
  callout: { width: 200, padding: 10 },
  calloutTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text, marginBottom: 4 },
  calloutMeta: { fontSize: 12, color: COLORS.muted, fontWeight: "700" },
  calloutPriority: { fontSize: 12, fontWeight: "900", marginTop: 2 },
  calloutTap: { marginTop: 6, fontSize: 11, color: COLORS.navy, fontWeight: "700" },
  listWrap: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  sectionCount: {
    minWidth: 28,
    textAlign: "center",
    color: COLORS.navy,
    fontWeight: "900",
    backgroundColor: COLORS.softBlue,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    padding: 14,
  },
  emptyText: { flex: 1, color: COLORS.muted, fontWeight: "700" },
  issueCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  priorityLine: { width: 6 },
  issueBody: { flex: 1, padding: 12 },
  issueTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  issueTitle: { flex: 1, color: COLORS.text, fontWeight: "900", fontSize: 15 },
  priorityPill: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  issueMeta: { marginTop: 5, color: COLORS.muted, fontWeight: "700", fontSize: 12 },
  issueDescription: { marginTop: 8, color: COLORS.muted, fontWeight: "600", lineHeight: 18 },
  issueActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  resolveBtn: { backgroundColor: COLORS.green },
  actionText: { color: "#fff", fontWeight: "900" },
});
