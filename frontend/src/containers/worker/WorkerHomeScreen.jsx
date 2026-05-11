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
import { SafeAreaView } from "react-native-safe-area-context";
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

function getPriorityColor(priority) {
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
}

function formatDistance(issue) {
  const distance = issue.distance_meters ?? issue.distance;

  if (!distance) return null;

  const meters = Math.round(Number(distance));
  if (!Number.isFinite(meters)) return null;

  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km away` : `${meters} m away`;
}

export default function WorkerHomeScreen({ navigation }) {
  const [activePanel, setActivePanel] = useState("nearby");
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [workerRegion, setWorkerRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const { height } = useWindowDimensions();
  const mapHeight = Math.min(Math.max(height * 0.48, 315), 430);
  const mapRef = useRef(null);

  const activeRegion = workerRegion || DEFAULT_REGION;
  const shownIssues = activePanel === "nearby" ? nearbyIssues : assignedIssues;

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
      .map((issue) => {
        const latitude = parseFloat(issue.latitude);
        const longitude = parseFloat(issue.longitude);

        return {
          ...issue,
          coords:
            Number.isFinite(latitude) && Number.isFinite(longitude)
              ? { latitude, longitude }
              : null,
        };
      })
      .filter((issue) => issue.coords);
  }, [nearbyIssues]);

  const assignToMe = async (issue) => {
    try {
      setAssigningId(issue.id);
      await api.patch(`/worker/issues/${issue.id}/assign-to-me`);
      setActivePanel("assigned");
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

  const IssueCard = ({ issue, assigned }) => {
    const priorityColor = getPriorityColor(issue.priority);
    const distanceLabel = formatDistance(issue);

    return (
      <View style={styles.issueCard}>
        <View style={styles.issueHeader}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={styles.issueTitle} numberOfLines={1}>
            {issue.title}
          </Text>
          <Text style={[styles.priorityPill, { color: priorityColor, borderColor: priorityColor }]}>
            {issue.priority}
          </Text>
        </View>

        <Text style={styles.issueMeta} numberOfLines={1}>
          {[issue.category, issue.location, distanceLabel].filter(Boolean).join(" - ")}
        </Text>
        <Text style={styles.issueDescription} numberOfLines={2}>
          {issue.description}
        </Text>

        <Pressable
          onPress={() => (assigned ? markResolved(issue) : assignToMe(issue))}
          disabled={assigningId === issue.id}
          style={[
            styles.actionBtn,
            assigned && styles.resolveBtn,
            assigningId === issue.id && { opacity: 0.55 },
          ]}
        >
          <Ionicons
            name={assigned ? "checkmark-circle-outline" : "briefcase-outline"}
            size={16}
            color="#fff"
          />
          <Text style={styles.actionText}>
            {assigned ? "Mark Resolved" : assigningId === issue.id ? "Assigning..." : "Assign to me"}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.modePill}>
            <Ionicons name="construct-outline" size={13} color={COLORS.navy} />
            <Text style={styles.modePillText}>Worker Mode</Text>
          </View>
          <Text style={styles.title}>Nearby Field Work</Text>
          <Text style={styles.subtitle}>Unassigned reports within {RADIUS_LABEL} of your location.</Text>
        </View>

        <Pressable
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "CitizenHome" }] })}
          style={styles.citizenBtn}
        >
          <Ionicons name="person-outline" size={17} color={COLORS.navy} />
          <Text style={styles.citizenText}>Citizen</Text>
        </Pressable>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.quickPill}>
          <Ionicons name="locate-outline" size={15} color={COLORS.orange} />
          <Text style={styles.quickText}>{nearbyIssues.length} nearby</Text>
        </View>
        <View style={styles.quickPill}>
          <Ionicons name="clipboard-outline" size={15} color={COLORS.navy} />
          <Text style={styles.quickText}>{assignedIssues.length} assigned</Text>
        </View>
        <Pressable onPress={loadWorkerIssues} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={17} color={COLORS.navy} />
        </Pressable>
      </View>

      {loading ? (
        <View style={[styles.loadingBox, { height: mapHeight }]}>
          <ActivityIndicator size="large" color={COLORS.navy} />
          <Text style={styles.loadingText}>Loading worker map...</Text>
        </View>
      ) : (
        <View style={[styles.mapFrame, { height: mapHeight }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
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
                    <Text style={styles.calloutTap}>Tap to assign</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          <View style={styles.radiusBadge}>
            <Ionicons name="radio-button-on-outline" size={14} color={COLORS.navy} />
            <Text style={styles.radiusText}>{RADIUS_LABEL} radius</Text>
          </View>

          <View style={styles.legend}>
            {["critical", "high", "medium", "low"].map((priority) => (
              <View key={priority} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: getPriorityColor(priority) }]} />
                <Text style={styles.legendText}>{priority}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.panel}>
        <View style={styles.panelHandle} />
        <View style={styles.panelTabs}>
          <Pressable
            onPress={() => setActivePanel("nearby")}
            style={[styles.panelTab, activePanel === "nearby" && styles.panelTabActive]}
          >
            <Text style={[styles.panelTabText, activePanel === "nearby" && styles.panelTabTextActive]}>
              Nearby
            </Text>
            <Text style={[styles.panelTabCount, activePanel === "nearby" && styles.panelTabCountActive]}>
              {nearbyIssues.length}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActivePanel("assigned")}
            style={[styles.panelTab, activePanel === "assigned" && styles.panelTabActive]}
          >
            <Text style={[styles.panelTabText, activePanel === "assigned" && styles.panelTabTextActive]}>
              Assigned
            </Text>
            <Text style={[styles.panelTabCount, activePanel === "assigned" && styles.panelTabCountActive]}>
              {assignedIssues.length}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.panelList}
          contentContainerStyle={styles.panelListContent}
          showsVerticalScrollIndicator={false}
        >
          {shownIssues.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name={activePanel === "nearby" ? "map-outline" : "checkmark-done-outline"}
                size={24}
                color={activePanel === "nearby" ? COLORS.muted : COLORS.green}
              />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>
                  {activePanel === "nearby" ? "No nearby reports" : "No assigned reports"}
                </Text>
                <Text style={styles.emptyText}>
                  {activePanel === "nearby"
                    ? "Unassigned issues inside your radius will appear here."
                    : "Issues you assign to yourself will appear here."}
                </Text>
              </View>
            </View>
          ) : (
            shownIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} assigned={activePanel === "assigned"} />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
  },
  headerCopy: { flex: 1 },
  modePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.softBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 7,
  },
  modePillText: { color: COLORS.navy, fontWeight: "900", fontSize: 11 },
  title: { color: COLORS.text, fontSize: 23, fontWeight: "900" },
  subtitle: { color: COLORS.muted, fontWeight: "700", fontSize: 12, marginTop: 4 },
  citizenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  citizenText: { color: COLORS.navy, fontWeight: "900", fontSize: 12 },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  quickPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    height: 34,
  },
  quickText: { color: COLORS.text, fontWeight: "900", fontSize: 12 },
  refreshBtn: {
    marginLeft: "auto",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    borderRadius: 22,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 10, color: COLORS.muted, fontWeight: "800" },
  mapFrame: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softBlue,
  },
  map: { flex: 1 },
  radiusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    paddingHorizontal: 11,
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radiusText: { color: COLORS.navy, fontWeight: "900", fontSize: 12 },
  legend: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    paddingHorizontal: 9,
    height: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: {
    color: COLORS.muted,
    fontWeight: "900",
    fontSize: 10,
    textTransform: "capitalize",
  },
  callout: { width: 190, padding: 8 },
  calloutTitle: { color: COLORS.text, fontSize: 14, fontWeight: "900", marginBottom: 4 },
  calloutMeta: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  calloutPriority: { fontSize: 12, fontWeight: "900", marginTop: 2 },
  calloutTap: { marginTop: 6, color: COLORS.navy, fontSize: 11, fontWeight: "800" },
  panel: {
    flex: 1,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  panelHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 10,
  },
  panelTabs: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#EEF3F8",
    borderRadius: 15,
    padding: 4,
  },
  panelTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  panelTabActive: { backgroundColor: COLORS.navy },
  panelTabText: { color: COLORS.navy, fontWeight: "900" },
  panelTabTextActive: { color: "#fff" },
  panelTabCount: {
    minWidth: 24,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    color: COLORS.navy,
    backgroundColor: COLORS.card,
    fontWeight: "900",
    fontSize: 12,
  },
  panelTabCountActive: { color: COLORS.navy, backgroundColor: "#fff" },
  panelList: { marginTop: 12 },
  panelListContent: { gap: 10, paddingBottom: 22 },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: COLORS.text, fontWeight: "900" },
  emptyText: { color: COLORS.muted, fontWeight: "700", fontSize: 12, marginTop: 3 },
  issueCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    backgroundColor: "#fff",
    padding: 12,
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityDot: { width: 9, height: 9, borderRadius: 5 },
  issueTitle: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: "900" },
  priorityPill: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "capitalize",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  issueMeta: { marginTop: 6, color: COLORS.muted, fontWeight: "800", fontSize: 12 },
  issueDescription: {
    marginTop: 7,
    color: COLORS.muted,
    fontWeight: "600",
    lineHeight: 18,
    fontSize: 12,
  },
  actionBtn: {
    alignSelf: "flex-end",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  resolveBtn: { backgroundColor: COLORS.green },
  actionText: { color: "#fff", fontWeight: "900", fontSize: 12 },
});
