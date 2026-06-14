import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Callout, Circle, Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";
import { getAuthUser } from "../../services/api";
import { getPusher } from "../../services/echo";

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

const RADIUS_METERS = 5000;
const RADIUS_LABEL = "5 km";

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

function formatStatus(status) {
  return status?.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Pending";
}

function formatDistance(issue) {
  const distance = issue.distance_meters ?? issue.distance;
  const meters = Math.round(Number(distance));

  if (!Number.isFinite(meters) || meters <= 0) return null;

  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km away` : `${meters} m away`;
}

function personName(person, fallback) {
  return person?.name || [person?.first_name, person?.father_name, person?.last_name].filter(Boolean).join(" ") || fallback;
}

export default function WorkerHomeScreen({ navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeView, setActiveView] = useState("map");
  const [workerTab, setWorkerTab] = useState("active");
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [nearbyMode, setNearbyMode] = useState("gps_fallback");
  const [nearbyMunicipality, setNearbyMunicipality] = useState(null);
  const [workerRegion, setWorkerRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyIssueId, setBusyIssueId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const mapRef = useRef(null);

  const activeRegion = workerRegion || DEFAULT_REGION;

  const activeAssigned = useMemo(
    () => assignedIssues.filter((i) => i.status !== "resolved"),
    [assignedIssues]
  );
  const completedAssigned = useMemo(
    () => assignedIssues.filter((i) => i.status === "resolved"),
    [assignedIssues]
  );

  const reportList = activeView === "assigned"
    ? (workerTab === "active" ? activeAssigned : completedAssigned)
    : nearbyIssues;

  const loadWorkerIssues = useCallback(async () => {
    try {
      setLoading(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location Needed", "Worker mode needs location permission to show nearby unassigned issues.");
        setWorkerRegion(DEFAULT_REGION);

        // Still call nearby — municipality workers don't need GPS
        const [assignedResponse, nearbyResponse] = await Promise.all([
          api.get("/worker/issues/assigned"),
          api.get("/worker/issues/nearby"),
        ]);
        setAssignedIssues(assignedResponse.data.data || []);
        const mode = nearbyResponse.data.mode || "gps_fallback";
        const main = nearbyResponse.data.data || [];
        const unlocated = nearbyResponse.data.unlocated || [];
        setNearbyMode(mode);
        setNearbyMunicipality(nearbyResponse.data.municipality || null);
        setNearbyIssues([...main, ...unlocated]);
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

      const mode = nearbyResponse.data.mode || "gps_fallback";
      const main = nearbyResponse.data.data || [];
      const unlocated = nearbyResponse.data.unlocated || [];
      setNearbyMode(mode);
      setNearbyMunicipality(nearbyResponse.data.municipality || null);
      setAssignedIssues(assignedResponse.data.data || []);
      setNearbyIssues([...main, ...unlocated]);
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
      api.get('/notifications', { params: { role: 'worker' } }).then(({ data }) => setUnreadCount(data.unread_count || 0)).catch(() => {});
    }, [loadWorkerIssues])
  );

  useEffect(() => {
    const user = getAuthUser();
    if (!user) return;
    const pusher = getPusher();
    if (!pusher) return;
    const handler = (data) => { if (data?.recipient_role === 'worker') setUnreadCount((prev) => prev + 1); };
    const channel = pusher.subscribe(`private-user.${user.id}`);
    channel.bind('notification.sent', handler);
    return () => {
      channel.unbind('notification.sent', handler);
    };
  }, []);

  const mapNearbyIssues = useMemo(() => {
    return nearbyIssues
      .map((issue) => {
        const latitude = parseFloat(issue.latitude);
        const longitude = parseFloat(issue.longitude);
        return {
          ...issue,
          coords: Number.isFinite(latitude) && Number.isFinite(longitude)
            ? { latitude, longitude } : null,
        };
      })
      .filter((issue) => issue.coords);
  }, [nearbyIssues]);

  const mapAssignedIssues = useMemo(() => {
    return assignedIssues
      .filter((issue) => issue.status !== "resolved")
      .map((issue) => {
        const latitude = parseFloat(issue.latitude);
        const longitude = parseFloat(issue.longitude);
        return {
          ...issue,
          coords: Number.isFinite(latitude) && Number.isFinite(longitude)
            ? { latitude, longitude } : null,
        };
      })
      .filter((issue) => issue.coords);
  }, [assignedIssues]);

  const assignedWithoutCoords = activeAssigned.length - mapAssignedIssues.length;

  const openMapsNavigation = (issue) => {
    const lat = Number(issue.latitude);
    const lng = Number(issue.longitude);
    const label = encodeURIComponent(issue.title || "Issue");
    const url = `https://maps.google.com/?daddr=${lat},${lng}&q=${label}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Navigation", "Could not open maps app.")
    );
  };

  const openIssue = (issue, assigned) => {
    setSelectedIssue({ issue, assigned });
    setResolutionNote(issue.worker_resolution_note || "");
    setResolutionPhoto(null);
  };

  const captureResolutionPhoto = () => {
    Alert.alert("Resolution Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission needed", "Allow camera access to take a photo.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]) setResolutionPhoto(result.assets[0]);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission needed", "Allow gallery access to pick a photo.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]) setResolutionPhoto(result.assets[0]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const assignToMe = async (issue) => {
    try {
      setBusyIssueId(issue.id);
      await api.patch(`/worker/issues/${issue.id}/assign-to-me`);
      setSelectedIssue(null);
      setActiveView("assigned");
      await loadWorkerIssues();
    } catch (error) {
      Alert.alert("Assign Issue", error.message || "Could not assign this issue.");
    } finally {
      setBusyIssueId(null);
    }
  };

  const markResolved = async (issue) => {
    const note = resolutionNote.trim();
    if (note.length < 5) {
      Alert.alert("Fix Description", "Please describe what you fixed before marking this report as resolved.");
      return;
    }
    if (!resolutionPhoto) {
      Alert.alert("Resolution Proof", "Please add a proof photo before marking this report as resolved.");
      return;
    }

    try {
      setBusyIssueId(issue.id);

      const formData = new FormData();
      formData.append("status", "resolved");
      formData.append("worker_resolution_note", note);
      formData.append("resolution_image", {
        uri: resolutionPhoto.uri,
        name: resolutionPhoto.fileName || "resolution-photo.jpg",
        type: resolutionPhoto.mimeType || "image/jpeg",
      });
      await api.post(`/worker/issues/${issue.id}/status`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResolutionPhoto(null);
      setSelectedIssue(null);
      await loadWorkerIssues();
    } catch (error) {
      Alert.alert("Update Issue", error.message || "Could not update this issue.");
    } finally {
      setBusyIssueId(null);
    }
  };

  const ReportCard = ({ issue, assigned }) => {
    const priorityColor = getPriorityColor(issue.priority);
    const distanceLabel = formatDistance(issue);

    return (
      <Pressable onPress={() => openIssue(issue, assigned)} style={styles.reportCard}>
        <View style={styles.reportCardTop}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={styles.reportTitle} numberOfLines={1}>
            {issue.title}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </View>
        <Text style={styles.reportMeta} numberOfLines={1}>
          {[issue.category, distanceLabel || issue.location].filter(Boolean).join(" - ")}
        </Text>
        <Text style={styles.reportDescription} numberOfLines={2}>
          {issue.description}
        </Text>
        <View style={styles.reportFooter}>
          <Text style={[styles.priorityPill, { color: priorityColor, borderColor: priorityColor }]}>
            {issue.priority}
          </Text>
          <Text style={styles.statusPill}>{formatStatus(issue.status)}</Text>
        </View>
      </Pressable>
    );
  };

  const Tabs = () => (
    <View style={styles.tabs}>
      {[
        ["map", "Map", "map-outline"],
        ["nearby", "Nearby", "locate-outline"],
        ["assigned", "My Reports", "clipboard-outline"],
      ].map(([key, label, icon]) => {
        const active = activeView === key;
        const count = key === "nearby" ? nearbyIssues.length : key === "assigned" ? assignedIssues.length : null;

        return (
          <Pressable
            key={key}
            onPress={() => setActiveView(key)}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
          >
            <Ionicons name={icon} size={16} color={active ? "#fff" : COLORS.navy} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            {count !== null && (
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (selectedIssue) {
    const { issue, assigned } = selectedIssue;
    const priorityColor = getPriorityColor(issue.priority);
    const reporter = personName(issue.user, "Unknown citizen");
    const assignee = personName(issue.assignee, issue.assigned_to ? "Assigned worker" : "Unassigned");
    const canResolve = assigned && !["resolved", "under_investigation", "rejected"].includes(issue.status);

    return (
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView
          style={styles.detailShell}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setSelectedIssue(null)} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.navy} />
            </Pressable>
            <Text style={styles.detailHeaderTitle}>Report Details</Text>
            <Pressable onPress={loadWorkerIssues} style={styles.iconBtn}>
              <Ionicons name="refresh-outline" size={20} color={COLORS.navy} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.detailScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {issue.image_url ? (
            <Image source={{ uri: issue.image_url }} style={styles.detailImage} />
          ) : (
            <View style={styles.noImageBox}>
              <Ionicons name="image-outline" size={30} color={COLORS.muted} />
              <Text style={styles.noImageText}>No image attached yet</Text>
            </View>
          )}

          <View style={styles.detailCard}>
            <View style={styles.detailChips}>
              <Text style={[styles.detailPriority, { color: priorityColor, borderColor: priorityColor }]}>
                {issue.priority}
              </Text>
              <Text style={styles.statusPill}>{formatStatus(issue.status)}</Text>
              {formatDistance(issue) && <Text style={styles.statusPill}>{formatDistance(issue)}</Text>}
            </View>

            <Text style={styles.detailTitle}>{issue.title}</Text>
            <Text style={styles.detailDescription}>{issue.description}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>People</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.navy} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Reported by</Text>
                <Text style={styles.infoValue}>{reporter}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={18} color={COLORS.orange} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Assigned to</Text>
                <Text style={styles.infoValue}>{assignee}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Report Info</Text>
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={18} color={COLORS.navy} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{issue.category}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={COLORS.orange} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{issue.location}</Text>
              </View>
            </View>
            {issue.latitude && issue.longitude && (
              <View style={styles.infoRow}>
                <Ionicons name="navigate-outline" size={18} color={COLORS.green} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Coordinates</Text>
                  <Text style={styles.infoValue}>
                    {Number(issue.latitude).toFixed(5)}, {Number(issue.longitude).toFixed(5)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {issue.worker_resolution_note && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Worker Fix Description</Text>
              <Text style={styles.detailDescription}>{issue.worker_resolution_note}</Text>
            </View>
          )}

          {canResolve && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Fix Description</Text>
              <Text style={styles.inputHint}>Describe what you did before marking this report as resolved.</Text>
              <TextInput
                value={resolutionNote}
                onChangeText={setResolutionNote}
                placeholder="Example: Replaced the damaged streetlight bulb and tested the light."
                placeholderTextColor="#94A3B8"
                style={styles.resolutionInput}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.inputHint, { marginTop: 12 }]}>Resolution photo (required)</Text>
              {resolutionPhoto ? (
                <View style={styles.resolutionPhotoWrap}>
                  <Image source={{ uri: resolutionPhoto.uri }} style={styles.resolutionPhotoPreview} />
                  <Pressable style={styles.retakeResolutionBtn} onPress={captureResolutionPhoto}>
                    <Ionicons name="camera" size={14} color={COLORS.navy} />
                    <Text style={styles.retakeResolutionText}>Retake</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.resolutionCameraBtn} onPress={captureResolutionPhoto}>
                  <Ionicons name="camera-outline" size={18} color={COLORS.navy} />
                  <Text style={styles.resolutionCameraBtnText}>Take Photo</Text>
                </Pressable>
              )}
            </View>
          )}
          </ScrollView>

          <View style={styles.detailActionBar}>
          {assigned && issue.latitude && issue.longitude && (
            <Pressable
              onPress={() => openMapsNavigation(issue)}
              style={styles.navigateAction}
            >
              <Ionicons name="navigate-outline" size={18} color={COLORS.navy} />
              <Text style={styles.navigateActionText}>Navigate</Text>
            </Pressable>
          )}
          {(canResolve || !assigned) && (
            <Pressable
              onPress={() => (assigned ? markResolved(issue) : assignToMe(issue))}
              disabled={busyIssueId === issue.id}
              style={[
                styles.primaryAction,
                assigned && styles.resolveAction,
                busyIssueId === issue.id && { opacity: 0.55 },
              ]}
            >
              {busyIssueId === issue.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={assigned ? "checkmark-circle-outline" : "briefcase-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.primaryActionText}>
                    {assigned ? "Mark Resolved" : "Assign to me"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.modePill}>
            <Ionicons name="construct-outline" size={13} color={COLORS.navy} />
            <Text style={styles.modePillText}>Worker Mode</Text>
          </View>
          <Text style={styles.title}>Field Work</Text>
          <Text style={styles.subtitle}>Nearby unassigned reports and your assigned work.</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { navigation.navigate("Notifications", { role: "worker" }); setUnreadCount(0); }}
            style={styles.workerBellBtn}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.navy} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "CitizenHome" }] })}
            style={styles.citizenBtn}
          >
            <Ionicons name="person-outline" size={17} color={COLORS.navy} />
            <Text style={styles.citizenText}>Citizen</Text>
          </Pressable>
        </View>
      </View>

      <Tabs />

      {activeView === "map" ? (
        <View style={styles.mapPage}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={activeRegion}
            showsUserLocation
            showsMyLocationButton
            onMapReady={() => mapRef.current?.animateToRegion(activeRegion, 500)}
          >
            {nearbyMode !== "municipality" && (
              <Circle
                center={{ latitude: activeRegion.latitude, longitude: activeRegion.longitude }}
                radius={RADIUS_METERS}
                strokeColor="rgba(25, 64, 95, 0.45)"
                fillColor="rgba(25, 64, 95, 0.12)"
              />
            )}
            {/* Orange pins — nearby unassigned issues */}
            {mapNearbyIssues.map((issue) => (
              <Marker
                key={`nearby-${issue.id}`}
                coordinate={issue.coords}
                pinColor="#EC9F4B"
              >
                <Callout onPress={() => openIssue(issue, false)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>{issue.title}</Text>
                    <Text style={styles.calloutMeta}>{issue.category}</Text>
                    <Text style={[styles.calloutPriority, { color: "#EC9F4B" }]}>UNASSIGNED</Text>
                    <Text style={styles.calloutTap}>Tap to claim</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
            {/* Green pins — my assigned issues */}
            {mapAssignedIssues.map((issue) => (
              <Marker
                key={`assigned-${issue.id}`}
                coordinate={issue.coords}
                pinColor="#4AA85C"
              >
                <Callout onPress={() => openIssue(issue, true)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>{issue.title}</Text>
                    <Text style={styles.calloutMeta}>{issue.category}</Text>
                    <Text style={[styles.calloutPriority, { color: "#4AA85C" }]}>MY ISSUE</Text>
                    <Text style={styles.calloutTap}>Tap to view details</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {loading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={COLORS.navy} />
              <Text style={styles.mapLoadingText}>Loading pins…</Text>
            </View>
          )}

          <View style={styles.radiusBadge}>
            <Ionicons
              name={nearbyMode === "municipality" ? "business-outline" : "radio-button-on-outline"}
              size={14}
              color={COLORS.navy}
            />
            <Text style={styles.radiusText}>
              {nearbyMode === "municipality"
                ? (nearbyMunicipality || "Municipality")
                : `${RADIUS_LABEL} radius`}
            </Text>
          </View>

          {assignedWithoutCoords > 0 && (
            <Pressable style={styles.missingPinsBadge} onPress={() => setActiveView("assigned")}>
              <Ionicons name="warning-outline" size={13} color={COLORS.orange} />
              <Text style={styles.missingPinsText}>
                {assignedWithoutCoords} assigned {assignedWithoutCoords === 1 ? "issue" : "issues"} not on map → View list
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.listPage}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>
                {activeView === "assigned" ? "My Reports" : "Nearby Reports"}
              </Text>
              <Text style={styles.listSubtitle}>
                {activeView === "assigned"
                  ? "Your assigned work."
                  : nearbyMode === "municipality"
                  ? `Unassigned reports in ${nearbyMunicipality || "your municipality"}.`
                  : `Unassigned reports within ${RADIUS_LABEL}.`}
              </Text>
            </View>
            <Pressable onPress={loadWorkerIssues} style={styles.iconBtn}>
              <Ionicons name="refresh-outline" size={20} color={COLORS.navy} />
            </Pressable>
          </View>

          {activeView === "assigned" && (
            <View style={styles.workerTabsRow}>
              <Pressable
                style={[styles.workerTab, workerTab === "active" && styles.workerTabActive]}
                onPress={() => setWorkerTab("active")}
              >
                <Text style={[styles.workerTabText, workerTab === "active" && styles.workerTabTextActive]}>
                  Active ({activeAssigned.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.workerTab, workerTab === "completed" && styles.workerTabActive]}
                onPress={() => setWorkerTab("completed")}
              >
                <Text style={[styles.workerTabText, workerTab === "completed" && styles.workerTabTextActive]}>
                  Completed ({completedAssigned.length})
                </Text>
              </Pressable>
            </View>
          )}

          {loading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator size="large" color={COLORS.navy} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {reportList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name={
                      activeView !== "assigned" ? "map-outline"
                      : workerTab === "completed" ? "checkmark-done-outline"
                      : "clipboard-outline"
                    }
                    size={30}
                    color={workerTab === "completed" ? COLORS.green : COLORS.muted}
                  />
                  <Text style={styles.emptyTitle}>
                    {activeView !== "assigned" ? "No nearby reports"
                      : workerTab === "completed" ? "No completed reports yet"
                      : "No active reports"}
                  </Text>
                  <Text style={styles.emptyText}>
                    {activeView !== "assigned"
                      ? nearbyMode === "municipality"
                        ? `Unassigned issues in ${nearbyMunicipality || "your municipality"} will appear here.`
                        : "Unassigned issues in your radius will appear here."
                      : workerTab === "completed"
                      ? "Reports you mark as resolved will appear here."
                      : "Reports you assign to yourself will appear here."}
                  </Text>
                </View>
              ) : (
                reportList.map((issue) => (
                  <ReportCard key={issue.id} issue={issue} assigned={activeView === "assigned"} />
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
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
  title: { color: COLORS.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: COLORS.muted, fontWeight: "700", fontSize: 12, marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  workerBellBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  bellBadge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4, borderWidth: 2, borderColor: "#fff",
  },
  bellBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
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
  tabs: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#EEF3F8",
    borderRadius: 16,
    padding: 4,
    marginTop: 14,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tabBtnActive: { backgroundColor: COLORS.navy },
  tabText: { color: COLORS.navy, fontWeight: "900", fontSize: 12 },
  tabTextActive: { color: "#fff" },
  tabCount: {
    minWidth: 20,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: COLORS.navy,
    backgroundColor: COLORS.card,
    fontWeight: "900",
    fontSize: 11,
  },
  tabCountActive: { color: COLORS.navy, backgroundColor: "#fff" },
  mapPage: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softBlue,
    marginBottom: 12,
  },
  map: { flex: 1 },
  mapLoadingOverlay: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapLoadingText: { fontSize: 12, color: COLORS.navy, fontWeight: "700" },
  missingPinsBadge: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.orange,
  },
  missingPinsText: { fontSize: 12, color: COLORS.orange, fontWeight: "800" },
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
  callout: { width: 190, padding: 8 },
  calloutTitle: { color: COLORS.text, fontSize: 14, fontWeight: "900", marginBottom: 4 },
  calloutMeta: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  calloutPriority: { fontSize: 12, fontWeight: "900", marginTop: 2 },
  calloutTap: { marginTop: 6, color: COLORS.navy, fontSize: 11, fontWeight: "800" },
  listPage: { flex: 1 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  listTitle: { color: COLORS.text, fontSize: 21, fontWeight: "900" },
  listSubtitle: { color: COLORS.muted, fontWeight: "700", marginTop: 3 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  workerTabsRow: {
    flexDirection: "row",
    backgroundColor: "#EEF3F8",
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  workerTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  workerTabActive: { backgroundColor: COLORS.navy },
  workerTabText: { fontSize: 13, fontWeight: "800", color: COLORS.navy },
  workerTabTextActive: { color: "#fff" },
  listLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { gap: 12, paddingBottom: 24 },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    padding: 22,
    marginTop: 22,
  },
  emptyTitle: { color: COLORS.text, fontWeight: "900", marginTop: 10 },
  emptyText: { color: COLORS.muted, fontWeight: "700", textAlign: "center", marginTop: 5 },
  reportCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    padding: 14,
  },
  reportCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityDot: { width: 9, height: 9, borderRadius: 5 },
  reportTitle: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: "900" },
  reportMeta: { marginTop: 7, color: COLORS.muted, fontWeight: "800", fontSize: 12 },
  reportDescription: {
    marginTop: 8,
    color: COLORS.muted,
    fontWeight: "600",
    lineHeight: 19,
    fontSize: 13,
  },
  reportFooter: { flexDirection: "row", gap: 8, marginTop: 11 },
  priorityPill: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPill: {
    color: COLORS.navy,
    backgroundColor: COLORS.softBlue,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  detailHeaderTitle: { color: COLORS.navy, fontSize: 18, fontWeight: "900" },
  detailShell: { flex: 1 },
  detailScroll: { paddingTop: 14, paddingBottom: 24 },
  detailImage: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  noImageBox: {
    height: 170,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noImageText: { color: COLORS.muted, fontWeight: "800" },
  detailCard: {
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
  },
  detailChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  detailPriority: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  detailTitle: { color: COLORS.text, fontSize: 22, fontWeight: "900", lineHeight: 28 },
  detailDescription: { color: COLORS.muted, fontWeight: "600", lineHeight: 21, marginTop: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    backgroundColor: "#F8FAFC",
  },
  infoText: { flex: 1 },
  infoLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "900" },
  infoValue: { color: COLORS.text, marginTop: 3, fontWeight: "900", lineHeight: 18 },
  inputHint: { color: COLORS.muted, fontWeight: "700", lineHeight: 18, marginBottom: 10 },
  resolutionInput: {
    minHeight: 116,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  resolutionCameraBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 46, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  resolutionCameraBtnText: { color: COLORS.navy, fontWeight: "900", fontSize: 14 },
  resolutionPhotoWrap: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  resolutionPhotoPreview: { width: "100%", height: 160 },
  retakeResolutionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, backgroundColor: COLORS.bg,
  },
  retakeResolutionText: { color: COLORS.navy, fontWeight: "800", fontSize: 13 },
  detailActionBar: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.bg,
    paddingTop: 10,
    paddingBottom: 12,
  },
  primaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resolveAction: { backgroundColor: COLORS.green },
  primaryActionText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  navigateAction: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navigateActionText: { color: COLORS.navy, fontSize: 15, fontWeight: "900" },
});
