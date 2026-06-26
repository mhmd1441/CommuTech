import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import MapView, { Callout, Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import api, { apiError, getAuthUser } from "../../services/api";
import { getPusher } from "../../services/echo";
import { fundingPercent, issueStatusLabel, money } from "../../services/issuePresentation";
import { WEB_BASE_URL } from "../../config";

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
  const meters = Math.round(Number(distance));

  if (!Number.isFinite(meters) || meters <= 0) return null;

  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km away` : `${meters} m away`;
}

function personName(person, fallback) {
  return person?.name || [person?.first_name, person?.father_name, person?.last_name].filter(Boolean).join(" ") || fallback;
}

export default function WorkerHomeScreen({ navigation, route }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatBadge, setChatBadge] = useState(0);
  const [activeView, setActiveView] = useState("map");
  const [workerTab, setWorkerTab] = useState("active");
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [nearbyMode, setNearbyMode] = useState("municipality");
  const [nearbyMunicipality, setNearbyMunicipality] = useState(null);
  const [workerRegion, setWorkerRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyIssueId, setBusyIssueId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [qrImageStatus, setQrImageStatus] = useState("loading");
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const [fundingCost, setFundingCost] = useState("");
  const [fundingRequestNote, setFundingRequestNote] = useState("");
  const [notice, setNotice] = useState(null);
  const mapRef = useRef(null);
  const noticeTimerRef = useRef(null);

  const activeRegion = workerRegion || DEFAULT_REGION;
  const currentUser = getAuthUser();

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

  const nearbyMunicipalityRef = useRef(null);
  const pendingIssuesRef = useRef([]);
  const municipalityReadyRef = useRef(false);

  // Applies the same relevance rule as the live issue.created handler below —
  // self-issue exclusion + municipality match — to any issues that arrived via
  // Pusher before the worker's municipality had finished loading.
  const flushPendingIssues = (municipality) => {
    if (pendingIssuesRef.current.length === 0) return;
    const queued = pendingIssuesRef.current;
    pendingIssuesRef.current = [];

    const relevant = queued.filter((issue) => {
      if (currentUser && Number(issue.user_id) === Number(currentUser.id)) return false;
      if (issue.municipality_en && issue.municipality_en !== municipality) return false;
      return true;
    });

    if (relevant.length > 0) {
      setNearbyIssues((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        return [...relevant.filter((i) => !existingIds.has(i.id)), ...prev];
      });
    }
  };

  const loadWorkerIssues = useCallback(async () => {
    try {
      setLoading(true);

      // Fire assigned fetch immediately — no GPS needed
      const assignedPromise = api.get("/worker/issues/assigned");

      // Request GPS in parallel
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Location Needed", "Worker mode needs location permission to show nearby unassigned issues.");
        setWorkerRegion(DEFAULT_REGION);

        const [assignedResponse, nearbyResponse] = await Promise.all([
          assignedPromise,
          api.get("/worker/issues/nearby"),
        ]);
        setAssignedIssues(assignedResponse.data.data || []);
        const mode = nearbyResponse.data.mode || "municipality";
        setNearbyMode(mode);
        setNearbyMunicipality(nearbyResponse.data.municipality || null);
        nearbyMunicipalityRef.current = nearbyResponse.data.municipality || null;
        municipalityReadyRef.current = true;
        flushPendingIssues(nearbyMunicipalityRef.current);
        setNearbyIssues([...(nearbyResponse.data.data || []), ...(nearbyResponse.data.unlocated || [])]);
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

      // Both in parallel — assigned was already in-flight
      const [assignedResponse, nearbyResponse] = await Promise.all([
        assignedPromise,
        api.get("/worker/issues/nearby"),
      ]);

      const mode = nearbyResponse.data.mode || "municipality";
      setNearbyMode(mode);
      setNearbyMunicipality(nearbyResponse.data.municipality || null);
      nearbyMunicipalityRef.current = nearbyResponse.data.municipality || null;
      municipalityReadyRef.current = true;
      flushPendingIssues(nearbyMunicipalityRef.current);
      setAssignedIssues(assignedResponse.data.data || []);
      setNearbyIssues([...(nearbyResponse.data.data || []), ...(nearbyResponse.data.unlocated || [])]);
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

  // Real-time: new chat message badge
  useEffect(() => {
    const user = getAuthUser();
    if (!user) return;
    const pusher = getPusher();
    if (!pusher) return;
    const handler = () => setChatBadge((prev) => prev + 1);
    const channel = pusher.subscribe(`private-user.${user.id}`);
    channel.bind('chat.message', handler);
    return () => { channel.unbind('chat.message', handler); };
  }, []);

  // Real-time: new issue created by a citizen
  useEffect(() => {
    const pusher = getPusher();
    if (!pusher) return;
    const channel = pusher.subscribe("issues");
    channel.bind("issue.created", (issue) => {
      // Mirrors the backend's municipality match in WorkerIssueController::nearby() —
      // surface issues in the worker's own municipality, plus "unlocated" ones where
      // the PostGIS lookup failed at creation (municipality_en is null).
      if (currentUser && Number(issue.user_id) === Number(currentUser.id)) return;

      // Municipality not loaded yet — queue the issue, flushPendingIssues will
      // process it once loadWorkerIssues resolves instead of dropping it.
      if (!municipalityReadyRef.current) {
        pendingIssuesRef.current = [...pendingIssuesRef.current, issue];
        return;
      }

      const municipality = nearbyMunicipalityRef.current;
      if (issue.municipality_en && issue.municipality_en !== municipality) return;
      setNearbyIssues((prev) => {
        if (prev.some((i) => i.id === issue.id)) return prev;
        return [issue, ...prev];
      });
    });
    return () => { channel.unbind("issue.created"); };
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const issueId = route?.params?.openIssueId;
    if (!issueId) return;

    (async () => {
      try {
        const { data } = await api.get(`/issues/${issueId}`);
        const assigned = Number(data.assigned_to) === Number(currentUser?.id);
        openIssue(data, assigned);
      } catch (error) {
        Alert.alert("Couldn't open report", "This report may no longer be available.");
      }
    })();
  }, [route?.params?.openIssueId]);

  const showNotice = (message, type = "success") => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);

    setNotice({ message, type });
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 3200);
  };

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
    setFundingCost(issue.estimated_cost ? String(issue.estimated_cost) : "");
    setFundingRequestNote(issue.funding_request_note || "");
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
      const { data } = await api.patch(`/worker/issues/${issue.id}/assign-to-me`);
      setSelectedIssue({ issue: data.issue, assigned: true });
      await loadWorkerIssues();
    } catch (error) {
      const err = apiError(error);
      Alert.alert("Assign Issue", err.message);
      if (err.status === 404) {
        setSelectedIssue(null);
        loadWorkerIssues();
      }
    } finally {
      setBusyIssueId(null);
    }
  };

  const requestFunding = async (issue) => {
    const estimatedCost = Number(fundingCost);
    const note = fundingRequestNote.trim();

    if (!Number.isFinite(estimatedCost) || estimatedCost <= 0) {
      Alert.alert("Estimated Cost", "Enter a valid estimated repair cost.");
      return;
    }

    if (note.length < 10) {
      Alert.alert("Funding Justification", "Please explain why this issue needs funding.");
      return;
    }

    try {
      setBusyIssueId(issue.id);
      const { data } = await api.post(`/worker/issues/${issue.id}/funding-request`, {
        estimated_cost: estimatedCost,
        funding_request_note: note,
      });

      setSelectedIssue({ issue: data.issue, assigned: true });
      await loadWorkerIssues();
      showNotice(data.message || "Funding request sent for admin review.");
    } catch (error) {
      const err = apiError(error);
      Alert.alert("Funding Request", err.message);
      if (err.status === 404) {
        setSelectedIssue(null);
        loadWorkerIssues();
      }
    } finally {
      setBusyIssueId(null);
    }
  };

  const startRepair = async (issue) => {
    try {
      setBusyIssueId(issue.id);
      const { data } = await api.post(`/worker/issues/${issue.id}/status`, {
        status: "in_progress",
      });
      setSelectedIssue({ issue: data.issue, assigned: true });
      await loadWorkerIssues();
    } catch (error) {
      const err = apiError(error);
      Alert.alert("Start Repair", err.message);
      if (err.status === 404) {
        setSelectedIssue(null);
        loadWorkerIssues();
      }
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
      const err = apiError(error);
      Alert.alert("Update Issue", err.message);
      if (err.status === 404) {
        setSelectedIssue(null);
        loadWorkerIssues();
      }
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
          <Text style={styles.statusPill}>{issueStatusLabel(issue)}</Text>
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
    const isOwnCitizenReport = Number(issue.user_id) === Number(currentUser?.id);
    const fundingBlocked = ["requested", "open", "expired"].includes(issue.funding_status);
    const canRequestFunding = assigned && !isOwnCitizenReport && issue.status === "pending" && issue.funding_status === "none";
    const canStartRepair = assigned && !isOwnCitizenReport && issue.status === "pending" && ["none", "funded"].includes(issue.funding_status);
    const canResolve = assigned && !isOwnCitizenReport && issue.status === "in_progress" && !fundingBlocked;
    const showFunding = issue.funding_status && issue.funding_status !== "none";
    const progress = fundingPercent(issue);
    const showPrimaryAction = (!assigned && !isOwnCitizenReport) || canStartRepair || canResolve;
    const primaryActionLabel = !assigned ? "Assign to me" : canStartRepair ? "Mark In Progress" : "Mark Resolved";
    const primaryActionIcon = !assigned ? "briefcase-outline" : canStartRepair ? "play-circle-outline" : "checkmark-circle-outline";
    const primaryAction = () => {
      if (!assigned) return assignToMe(issue);
      if (canStartRepair) return startRepair(issue);
      return markResolved(issue);
    };
    const isPubliclyVisible = ["in_progress", "resolved", "under_investigation"].includes(issue.status);
    const qrUrl = `${WEB_BASE_URL}/issue/${issue.id}/sticker-image`;
    const handleDownloadQr = async () => {
      setDownloadingQr(true);
      try {
        const fileUri = `${FileSystem.cacheDirectory}issue-${issue.id}-qr.png`;
        const { uri } = await FileSystem.downloadAsync(qrUrl, fileUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("Saved", "QR code saved to app storage.");
        }
      } catch (e) {
        console.error("QR download failed:", e);
        Alert.alert("Download failed", "Could not download the QR code. Check your connection and try again.");
      } finally {
        setDownloadingQr(false);
      }
    };

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

          {notice && (
            <View style={[styles.noticeBox, notice.type === "success" && styles.noticeSuccess]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.green} />
              <Text style={styles.noticeText}>{notice.message}</Text>
            </View>
          )}

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
              <Text style={styles.statusPill}>{issueStatusLabel(issue)}</Text>
              {formatDistance(issue) && <Text style={styles.statusPill}>{formatDistance(issue)}</Text>}
              {(issue.upvotes_count ?? 0) > 0 && (
                <Text style={styles.statusPill}>👥 {issue.upvotes_count} affected</Text>
              )}
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

          {isOwnCitizenReport && (
            <View style={[styles.detailCard, styles.conflictCard]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.conflictTitle}>Assignment restricted</Text>
                <Text style={styles.conflictText}>
                  You submitted this report as a citizen, so it must be handled by another worker.
                </Text>
              </View>
            </View>
          )}

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

          {showFunding && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Funding</Text>
              <View style={styles.fundingSummaryRow}>
                <View>
                  <Text style={styles.fundingAmount}>{money(issue.funding_raised)} raised</Text>
                  <Text style={styles.inputHint}>Goal: {money(issue.funding_goal)}</Text>
                </View>
                <Text style={styles.statusPill}>{issueStatusLabel(issue)}</Text>
              </View>
              {Number(issue.funding_goal || 0) > 0 && (
                <>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.inputHint}>{progress}% funded</Text>
                </>
              )}
              {!!issue.estimated_cost && (
                <Text style={styles.detailDescription}>Estimated repair cost: {money(issue.estimated_cost)}</Text>
              )}
              {!!issue.funding_request_note && (
                <Text style={styles.detailDescription}>{issue.funding_request_note}</Text>
              )}
            </View>
          )}

          {canRequestFunding && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Request Funding</Text>
              <Text style={styles.inputHint}>Use this only when the issue is valid but cannot be repaired directly without budget approval.</Text>
              <TextInput
                value={fundingCost}
                onChangeText={setFundingCost}
                keyboardType="decimal-pad"
                placeholder="Estimated cost"
                placeholderTextColor="#94A3B8"
                style={styles.fundingInput}
              />
              <TextInput
                value={fundingRequestNote}
                onChangeText={setFundingRequestNote}
                placeholder="Explain why funding is needed"
                placeholderTextColor="#94A3B8"
                style={[styles.resolutionInput, { marginTop: 10 }]}
                multiline
                textAlignVertical="top"
              />
              <Pressable
                onPress={() => requestFunding(issue)}
                disabled={busyIssueId === issue.id}
                style={[styles.fundingRequestBtn, busyIssueId === issue.id && { opacity: 0.55 }]}
              >
                {busyIssueId === issue.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="wallet-outline" size={18} color="#fff" />
                    <Text style={styles.primaryActionText}>Send Funding Request</Text>
                  </>
                )}
              </Pressable>
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
          {isPubliclyVisible && (
            <Pressable
              onPress={() => { setQrImageStatus("loading"); setQrVisible(true); }}
              style={styles.qrAction}
            >
              <Ionicons name="qr-code-outline" size={20} color={COLORS.navy} />
            </Pressable>
          )}
          {showPrimaryAction && (
            <Pressable
              onPress={primaryAction}
              disabled={busyIssueId === issue.id}
              style={[
                styles.primaryAction,
                canResolve && styles.resolveAction,
                busyIssueId === issue.id && { opacity: 0.55 },
              ]}
            >
              {busyIssueId === issue.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={primaryActionIcon}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.primaryActionText}>
                    {primaryActionLabel}
                  </Text>
                </>
              )}
            </Pressable>
          )}
          </View>
        </KeyboardAvoidingView>

        <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
          <View style={styles.qrOverlay}>
            <View style={styles.qrCard}>
              <ScrollView
                contentContainerStyle={styles.qrCardScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionTitle}>Public Status QR Code</Text>
                <Text style={styles.inputHint}>Anyone can scan this to view the report's public status — no login required.</Text>
                <View style={styles.qrImageWrap}>
                  {qrImageStatus !== "error" && (
                    <Image
                      source={{ uri: qrUrl }}
                      style={styles.qrImage}
                      onLoad={() => setQrImageStatus("loaded")}
                      onError={() => setQrImageStatus("error")}
                    />
                  )}
                  {qrImageStatus === "loading" && (
                    <View style={styles.qrImageOverlay}>
                      <ActivityIndicator color={COLORS.navy} />
                    </View>
                  )}
                  {qrImageStatus === "error" && (
                    <View style={styles.qrImageError}>
                      <Ionicons name="cloud-offline-outline" size={26} color={COLORS.muted} />
                      <Text style={styles.qrErrorText}>Couldn't load the QR code.</Text>
                      <Pressable onPress={() => setQrImageStatus("loading")} style={styles.qrRetryBtn}>
                        <Text style={styles.qrRetryText}>Retry</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={handleDownloadQr}
                  disabled={downloadingQr}
                  style={[styles.qrDownloadBtn, downloadingQr && { opacity: 0.55 }]}
                >
                  {downloadingQr ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#fff" />
                      <Text style={styles.primaryActionText}>Download / Share</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={() => setQrVisible(false)} style={styles.qrCloseBtn}>
                  <Text style={styles.navigateActionText}>Close</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
            onPress={() => { setChatBadge(0); navigation.navigate("Chat"); }}
            style={styles.workerBellBtn}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.navy} />
            {chatBadge > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{chatBadge > 9 ? "9+" : chatBadge}</Text>
              </View>
            )}
          </Pressable>
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
            {/* GPS-radius circle overlay — disabled. Every worker now has an assigned
                municipality (enforced in the admin panel), so nearbyMode is always
                "municipality" and this never rendered anyway. Left commented out
                instead of deleted in case the GPS fallback is restored later.
            {nearbyMode !== "municipality" && (
              <Circle
                center={{ latitude: activeRegion.latitude, longitude: activeRegion.longitude }}
                radius={RADIUS_METERS}
                strokeColor="rgba(25, 64, 95, 0.45)"
                fillColor="rgba(25, 64, 95, 0.12)"
              />
            )}
            */}
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

          {/* GPS-radius badge variant disabled — every worker has an assigned municipality now,
              so nearbyMode is always "municipality". Old ternary:
              name={nearbyMode === "municipality" ? "business-outline" : "radio-button-on-outline"}
              text={nearbyMode === "municipality" ? (nearbyMunicipality || "Municipality") : `${RADIUS_LABEL} radius`}
          */}
          <View style={styles.radiusBadge}>
            <Ionicons
              name={nearbyMode === "no_municipality" ? "warning-outline" : "business-outline"}
              size={14}
              color={COLORS.navy}
            />
            <Text style={styles.radiusText}>
              {nearbyMode === "no_municipality" ? "No municipality" : (nearbyMunicipality || "Municipality")}
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
              {/* GPS-radius subtitle variant disabled — see radiusBadge comment above. */}
              <Text style={styles.listSubtitle}>
                {activeView === "assigned"
                  ? "Your assigned work."
                  : nearbyMode === "no_municipality"
                  ? "No municipality assigned — contact your administrator."
                  : `Unassigned reports in ${nearbyMunicipality || "your municipality"}.`}
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
                    {activeView !== "assigned"
                      ? (nearbyMode === "no_municipality" ? "No municipality assigned" : "No nearby reports")
                      : workerTab === "completed" ? "No completed reports yet"
                      : "No active reports"}
                  </Text>
                  {/* GPS-radius empty-state variant disabled — see radiusBadge comment above. */}
                  <Text style={styles.emptyText}>
                    {activeView !== "assigned"
                      ? (nearbyMode === "no_municipality"
                        ? "You have no municipality assigned. Please contact your administrator."
                        : `Unassigned issues in ${nearbyMunicipality || "your municipality"} will appear here.`)
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
  noticeBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeSuccess: {
    borderColor: "#BBF7D0",
    backgroundColor: "#ECFDF5",
  },
  noticeText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
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
  conflictCard: {
    flexDirection: "row",
    gap: 10,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  conflictTitle: { color: COLORS.danger, fontSize: 14, fontWeight: "900" },
  conflictText: { marginTop: 3, color: COLORS.muted, fontSize: 13, fontWeight: "700", lineHeight: 18 },
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
  fundingSummaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  fundingAmount: { color: COLORS.text, fontSize: 19, fontWeight: "900" },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.navy,
  },
  fundingInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  fundingRequestBtn: {
    marginTop: 12,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
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
  qrAction: {
    height: 52,
    width: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  qrCard: {
    width: "100%",
    maxWidth: 340,
    maxHeight: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
  },
  qrCardScroll: {
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  qrImageWrap: {
    width: 220,
    height: 258,
    marginVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: 220,
    height: 258,
    resizeMode: "contain",
  },
  qrImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 12,
  },
  qrImageError: {
    width: 220,
    height: 258,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  qrErrorText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
  },
  qrRetryBtn: {
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.navy,
  },
  qrRetryText: {
    color: COLORS.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  qrDownloadBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qrCloseBtn: {
    height: 44,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
