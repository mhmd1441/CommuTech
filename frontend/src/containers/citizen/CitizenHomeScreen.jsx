import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import BottomNav from "../shared/BottomNav";
import api, { getAuthUser } from "../../services/api";
import { getPusher } from "../../services/echo";
import { getDefaultMunicipality, loadAppPreferences } from "../../services/preferences";
import { issueStatusKey, issueStatusLabel } from "../../services/issuePresentation";

const COLORS = {
  navy: "#19405F",
  navy2: "#1A4672",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#B91C1C",
};

const FILTERS = [
  "All",
  "Roads & Sidewalks",
  "Street Lighting & Electricity",
  "Traffic & Signals",
  "Waste & Sanitation",
  "Water & Drainage",
  "Environment & Public Spaces",
  "Public Safety",
  "Other",
];

// Lebanon default region
const LEBANON_REGION = {
  latitude: 33.8547,
  longitude: 35.8623,
  latitudeDelta: 1.2,
  longitudeDelta: 1.2,
};
const USER_REGION_DELTA = {
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

// Fallback coordinates for known cities
const CITY_COORDS = {
  beirut: { latitude: 33.8938, longitude: 35.5018 },
  tripoli: { latitude: 34.4367, longitude: 35.8497 },
  sidon: { latitude: 33.5631, longitude: 35.3712 },
  tyre: { latitude: 33.2705, longitude: 35.2038 },
  jounieh: { latitude: 33.9808, longitude: 35.6179 },
  zahle: { latitude: 33.8469, longitude: 35.9019 },
  baalbek: { latitude: 34.0042, longitude: 36.2086 },
};

function getCoordsFromLocation(location) {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(city)) return coords;
  }
  // Default to Beirut center if unknown
  return { latitude: 33.8938 + (Math.random() - 0.5) * 0.05, longitude: 35.5018 + (Math.random() - 0.5) * 0.05 };
}

function IssueListImage({ imageUrl }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <View style={[styles.issueImage, styles.noImage]}>
        <Ionicons name="image-outline" size={24} color={COLORS.muted} />
      </View>
    );
  }

  return (
    <View style={styles.issueImageFrame}>
      {!loaded && (
        <View style={styles.issueImageLoader}>
          <ActivityIndicator size="small" color={COLORS.navy} />
        </View>
      )}
      <Image
        source={{ uri: imageUrl }}
        style={[styles.issueImage, !loaded && styles.issueImageHidden]}
        onLoadEnd={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

function affectedCount(issue) {
  return issue.affected_count ?? ((issue.upvotes_count ?? 0) + 1);
}

function affectedLabel(issue) {
  const count = affectedCount(issue);
  return `${count} affected citizen${count === 1 ? "" : "s"}`;
}

export default function CitizenHomeScreen({ navigation, route }) {
  const [communityMode, setCommunityMode] = useState(false);
  const [viewMode, setViewMode] = useState("map");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRegion, setUserRegion] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedMunicipality, setSavedMunicipality] = useState(() => getDefaultMunicipality());
  const { height } = useWindowDimensions();
  const mapHeight = Math.max(420, height - 315);
  const mapRef = useRef(null);
  const fetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const centerMapOnUser = async () => {
      try {
        setLocationStatus("loading");

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

        if (permission.status !== "granted") {
          setLocationStatus("denied");
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isMounted) return;

        const nextRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          ...USER_REGION_DELTA,
        };

        setUserRegion(nextRegion);
        setLocationStatus("granted");
        mapRef.current?.animateToRegion(nextRegion, 900);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to get current location:", err);
        setLocationStatus("error");
      }
    };

    centerMapOnUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Re-read saved municipality in case user changed it in ProfileScreen
      loadAppPreferences().then(() => {
        setSavedMunicipality(getDefaultMunicipality());
      });
      fetchIssues();
      api.get('/notifications', { params: { role: 'citizen' } }).then(({ data }) => setUnreadCount(data.unread_count || 0)).catch(() => {});
    }, [selectedFilter, communityMode])
  );

  // Re-fetch when GPS resolves while community tab is already active.
  // If a fetch is already running, mark it as pending — fetchIssues will
  // run one final pass after the in-flight request finishes.
  useEffect(() => {
    if (communityMode && userRegion) {
      if (fetchingRef.current) {
        pendingRefreshRef.current = true;
      } else {
        fetchIssues();
      }
    }
  }, [userRegion]);

  useEffect(() => {
    const user = getAuthUser();
    if (!user) return;
    const pusher = getPusher();
    if (!pusher) return;
    const handler = (data) => { if (data?.recipient_role === 'citizen') setUnreadCount((prev) => prev + 1); };
    const channel = pusher.subscribe(`private-user.${user.id}`);
    channel.bind('notification.sent', handler);
    return () => {
      channel.unbind('notification.sent', handler);
      pusher.unsubscribe(`private-user.${user.id}`);
    };
  }, []);

  // Real-time: new issue created — show on community map immediately
  useEffect(() => {
    const pusher = getPusher();
    if (!pusher) return;
    const issueChannel = pusher.subscribe("issues");
    issueChannel.bind("issue.created", (issue) => {
      if (!communityMode) return;
      setIssues((prev) => {
        if (prev.some((i) => i.id === issue.id)) return prev;
        return [issue, ...prev];
      });
    });
    return () => { issueChannel.unbind("issue.created"); };
  }, [communityMode]);

  const fetchIssues = async ({ silent = false } = {}) => {
    if (fetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    fetchingRef.current = true;
    pendingRefreshRef.current = false;
    try {
      if (!silent) setLoading(true);
      const params = {};
      if (communityMode) {
        const muni = getDefaultMunicipality();
        if (muni) {
          params.municipality = muni;
        } else if (!userRegion) {
          if (!silent) setLoading(false);
          return;
        } else {
          params.lat = userRegion.latitude;
          params.lng = userRegion.longitude;
        }
      } else {
        params.mine = 1;
      }
      if (selectedFilter !== "All") params.category = selectedFilter;
      const { data } = await api.get("/issues", { params });
      setIssues(data.data || []);
    } catch (err) {
      console.error("Failed to fetch issues:", err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
      // A second trigger arrived while we were fetching — run one final refresh
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchIssues({ silent: true });
      }
    }
  };

  useEffect(() => {
    const createdIssue = route?.params?.createdIssue;
    const refreshAt = route?.params?.refreshAt;

    if (!refreshAt) return;

    if (createdIssue?.id) {
      setIssues((current) => {
        if (current.some((issue) => issue.id === createdIssue.id)) {
          return current;
        }

        return [createdIssue, ...current];
      });
    }

    fetchIssues({ silent: true });
    navigation.setParams({ createdIssue: undefined, refreshAt: undefined });
  }, [route?.params?.refreshAt]);

  const issuesWithCoords = useMemo(() => {
    return issues
      .filter((issue) => issue.status !== "resolved")
      .map((issue) => ({
        ...issue,
        coords:
          issue.latitude && issue.longitude
            ? { latitude: parseFloat(issue.latitude), longitude: parseFloat(issue.longitude) }
            : getCoordsFromLocation(issue.location),
      }));
  }, [issues]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical": return "#B91C1C";
      case "high": return "#D97706";
      case "medium": return "#2563EB";
      default: return COLORS.muted;
    }
  };

  const getStatusColor = (issue) => {
    switch (issueStatusKey(issue)) {
      case "resolved": return COLORS.green;
      case "funded": return COLORS.green;
      case "rejected": return COLORS.danger;
      case "in_progress": return COLORS.orange;
      case "under_review": return COLORS.orange;
      case "awaiting_funding": return COLORS.navy;
      case "expired": return COLORS.danger;
      default: return COLORS.navy;
    }
  };

  const getMarkerColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical": return "#B91C1C";
      case "high": return "#D97706";
      case "medium": return "#2563EB";
      default: return COLORS.navy;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>CommuTech</Text>
            <Text style={styles.headerSub}>Smart Civic Reporting</Text>
          </View>
          <Pressable
            onPress={() => { navigation.navigate("Notifications", { role: "citizen" }); setUnreadCount(0); }}
            style={styles.notificationBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.navy} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Community / My Issues tab */}
        <View style={styles.modeTabs}>
          <Pressable
            onPress={() => { setCommunityMode(false); setLoading(true); }}
            style={[styles.modeTab, !communityMode && styles.modeTabActive]}
          >
            <Text style={[styles.modeTabText, !communityMode && styles.modeTabTextActive]}>My Issues</Text>
          </Pressable>
          <Pressable
            onPress={() => { setCommunityMode(true); setLoading(true); }}
            style={[styles.modeTab, communityMode && styles.modeTabActive]}
          >
            <Ionicons name="people-outline" size={14} color={communityMode ? "#fff" : COLORS.navy} />
            <Text style={[styles.modeTabText, communityMode && styles.modeTabTextActive]}>Community</Text>
          </Pressable>
        </View>

        {/* View switch */}
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

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Content */}
        {communityMode && savedMunicipality && (
          <View style={styles.municipalityBanner}>
            <Ionicons name="location" size={13} color={COLORS.navy} />
            <Text style={styles.municipalityBannerText}>{savedMunicipality}</Text>
            <Text style={styles.municipalityBannerHint}>Change in Profile → Default Municipality</Text>
          </View>
        )}

        {communityMode && !savedMunicipality && locationStatus === "loading" ? (
          <View style={styles.noLocationWrap}>
            <ActivityIndicator size="large" color={COLORS.navy} />
            <Text style={styles.noLocationText}>Getting your location…</Text>
          </View>
        ) : communityMode && !savedMunicipality && locationStatus !== "granted" ? (
          <View style={styles.noLocationWrap}>
            <Ionicons name="location-outline" size={44} color={COLORS.muted} />
            <Text style={styles.noLocationTitle}>Location Required</Text>
            <Text style={styles.noLocationText}>Enable location to see community issues in your area, or set a Default Municipality in your Profile.</Text>
          </View>
        ) : viewMode === "map" ? (
          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              style={{ height: mapHeight, borderRadius: 16 }}
              initialRegion={userRegion || LEBANON_REGION}
              showsUserLocation={locationStatus === "granted"}
              showsMyLocationButton={locationStatus === "granted"}
              onMapReady={() => {
                if (userRegion) {
                  mapRef.current?.animateToRegion(userRegion, 500);
                }
              }}
            >
              {issuesWithCoords.map((issue) =>
                issue.coords ? (
                  <Marker
                    key={issue.id}
                    coordinate={issue.coords}
                    pinColor={getMarkerColor(issue.priority)}
                    onPress={() => setSelectedMarker(issue)}
                  >
                    <Callout onPress={() => navigation.navigate("IssueDetails", { issue })}>
                      <View style={styles.callout}>
                        <Text style={styles.calloutTitle} numberOfLines={1}>{issue.title}</Text>
                        <Text style={styles.calloutCategory}>{issue.category}</Text>
                        <Text style={[styles.calloutPriority, { color: getPriorityColor(issue.priority) }]}>
                          {issue.priority?.toUpperCase()}
                        </Text>
                        {communityMode && (
                          <Text style={styles.calloutVotes}>{affectedLabel(issue)}</Text>
                        )}
                        <Text style={styles.calloutTap}>Tap to view details →</Text>
                      </View>
                    </Callout>
                  </Marker>
                ) : null
              )}
            </MapView>
            {loading && (
              <View style={styles.mapLoadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.navy} />
                <Text style={styles.mapLoadingText}>Loading pins…</Text>
              </View>
            )}

            <View style={styles.mapFooter}>
              <Text style={styles.mapFooterText}>{issuesWithCoords.length} open issues</Text>
              <Text style={styles.mapFooterText}>{locationStatus === "granted" ? "Your location" : "Lebanon"}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.navy} style={{ marginTop: 40 }} />
            ) : issues.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.green} />
                <Text style={styles.emptyText}>No open issues found</Text>
              </View>
            ) : (
              issues.map((issue) => (
                <Pressable
                  key={issue.id}
                  onPress={() => navigation.navigate("IssueDetails", { issue })}
                  style={styles.issueCard}
                >
                  <View style={styles.issueRight}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.statusText, { color: getStatusColor(issue) }]}>
                        {issueStatusLabel(issue)}
                      </Text>
                      <Text style={[styles.priorityChip, { color: getPriorityColor(issue.priority), borderColor: getPriorityColor(issue.priority) + "35" }]}>
                        {issue.priority}
                      </Text>
                    </View>
                    <Text style={styles.issueTitle} numberOfLines={1}>{issue.title}</Text>
                    <Text style={styles.issueDescription} numberOfLines={2}>{issue.description}</Text>
                    <View style={styles.bottomMetaRow}>
                      <Text style={styles.metaText}>{issue.location}</Text>
                      {communityMode ? (
                        <View style={styles.voteChip}>
                          <Ionicons name="people-outline" size={11} color={COLORS.navy} />
                          <Text style={styles.voteChipText}>{affectedLabel(issue)}</Text>
                        </View>
                      ) : (
                        <Text style={styles.metaText}>{formatDate(issue.created_at)}</Text>
                      )}
                    </View>
                  </View>
                  <IssueListImage imageUrl={issue.image_url} />
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 104 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 26, fontWeight: "900", color: COLORS.text, letterSpacing: 0.2 },
  headerSub: { marginTop: 4, color: COLORS.muted, fontWeight: "700" },
  notificationBtn: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: "#fff",
    borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center",
  },
  bellBadge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4, borderWidth: 2, borderColor: "#fff",
  },
  bellBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  segmentWrap: {
    marginTop: 18, flexDirection: "row", backgroundColor: "#EEF3F8",
    borderRadius: 16, padding: 4, gap: 6,
  },
  segmentBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12 },
  segmentBtnActive: { backgroundColor: COLORS.navy },
  segmentText: { color: COLORS.navy, fontWeight: "800" },
  segmentTextActive: { color: "#fff" },
  filtersRow: { gap: 10, paddingVertical: 16 },
  filterChip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  filterChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  filterChipText: { color: COLORS.text, fontWeight: "800" },
  filterChipTextActive: { color: "#fff" },
  mapCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  mapLoadingOverlay: {
    position: "absolute", top: 14, left: 14, right: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 20,
    alignSelf: "center", width: 150,
  },
  mapLoadingText: { fontSize: 12, color: COLORS.navy, fontWeight: "700" },
  mapFooter: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  mapFooterText: { fontSize: 12, color: COLORS.muted, fontWeight: "800" },
  callout: { width: 200, padding: 10 },
  calloutTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text, marginBottom: 4 },
  calloutCategory: { fontSize: 12, color: COLORS.muted, fontWeight: "700" },
  calloutPriority: { fontSize: 12, fontWeight: "900", marginTop: 2 },
  calloutTap: { marginTop: 6, fontSize: 11, color: COLORS.navy, fontWeight: "700" },
  listWrap: { gap: 12 },
  issueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 12,
  },
  issueImage: { width: 76, height: 76, borderRadius: 16 },
  issueImageFrame: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: "#EEF3F8",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  issueImageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF3F8",
  },
  issueImageHidden: { opacity: 0 },
  noImage: { alignItems: "center", justifyContent: "center", backgroundColor: "#EEF3F8" },
  issueRight: { flex: 1, minWidth: 0 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 },
  statusText: { fontWeight: "800", fontSize: 12 },
  priorityChip: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "capitalize",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  issueTitle: { fontSize: 15, fontWeight: "900", color: COLORS.text },
  issueDescription: { marginTop: 5, color: COLORS.muted, fontWeight: "600", lineHeight: 17, fontSize: 12 },
  bottomMetaRow: { marginTop: 9, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metaText: { flex: 1, fontSize: 11, color: COLORS.muted, fontWeight: "700" },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: COLORS.muted, fontWeight: "700", fontSize: 16 },
  modeTabs: {
    marginTop: 16, flexDirection: "row", backgroundColor: "#EEF3F8",
    borderRadius: 14, padding: 4, gap: 4,
  },
  modeTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  modeTabActive: { backgroundColor: COLORS.navy },
  modeTabText: { color: COLORS.navy, fontWeight: "800", fontSize: 13 },
  modeTabTextActive: { color: "#fff" },
  noLocationWrap: { alignItems: "center", marginTop: 60, gap: 10, paddingHorizontal: 20 },
  noLocationTitle: { color: COLORS.text, fontWeight: "900", fontSize: 17 },
  noLocationText: { color: COLORS.muted, fontWeight: "700", fontSize: 14, textAlign: "center", lineHeight: 21 },
  calloutVotes: { fontSize: 11, color: COLORS.navy, fontWeight: "700", marginTop: 2 },
  voteChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  voteChipText: { fontSize: 11, color: COLORS.navy, fontWeight: "800" },
  municipalityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.navy + "12",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  municipalityBannerText: { fontSize: 13, fontWeight: "800", color: COLORS.navy },
  municipalityBannerHint: { fontSize: 11, color: COLORS.muted, fontWeight: "600", marginLeft: "auto" },
});
