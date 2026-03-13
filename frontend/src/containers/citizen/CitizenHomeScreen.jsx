import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../shared/BottomNav";

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

const FILTERS = ["All", "Roads", "Lighting", "Traffic", "Environment"];

const MOCK_ISSUES = [
  {
    id: 1,
    title: "Traffic light not working",
    priority: "Critical",
    status: "Pending",
    description:
      "The traffic light at the intersection has stopped working since morning and is causing traffic confusion.",
    location: "Beirut, Hamra",
    date: "14 Mar 2026",
    category: "Traffic",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Streetlight damaged",
    priority: "High",
    status: "In Progress",
    description:
      "One of the streetlights on the main road is broken and the area becomes very dark at night.",
    location: "Beirut, Verdun",
    date: "13 Mar 2026",
    category: "Lighting",
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Road pothole",
    priority: "Medium",
    status: "Pending",
    description:
      "A pothole is growing near the right side of the road and cars are swerving to avoid it.",
    location: "Jounieh",
    date: "12 Mar 2026",
    category: "Roads",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
  },
];

export default function CitizenHomeScreen({ navigation }) {
  const [viewMode, setViewMode] = useState("map");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filteredIssues = useMemo(() => {
    if (selectedFilter === "All") return MOCK_ISSUES;
    return MOCK_ISSUES.filter(
      (issue) => issue.category.toLowerCase() === selectedFilter.toLowerCase()
    );
  }, [selectedFilter]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical":
        return "#B91C1C";
      case "High":
        return "#D97706";
      case "Medium":
        return "#2563EB";
      default:
        return COLORS.muted;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Done":
        return COLORS.green;
      case "In Progress":
        return COLORS.orange;
      default:
        return COLORS.navy;
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>CommuTech</Text>
            <Text style={styles.headerSub}>Smart Civic Reporting</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            style={styles.notificationBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.navy} />
          </Pressable>
        </View>

        {/* View switch */}
        <View style={styles.segmentWrap}>
          <Pressable
            onPress={() => setViewMode("map")}
            style={[
              styles.segmentBtn,
              viewMode === "map" && styles.segmentBtnActive,
            ]}
          >
            <Ionicons
              name="map-outline"
              size={18}
              color={viewMode === "map" ? "#fff" : COLORS.navy}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === "map" && styles.segmentTextActive,
              ]}
            >
              Map View
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode("list")}
            style={[
              styles.segmentBtn,
              viewMode === "list" && styles.segmentBtnActive,
            ]}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={viewMode === "list" ? "#fff" : COLORS.navy}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === "list" && styles.segmentTextActive,
              ]}
            >
              List View
            </Text>
          </Pressable>
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Content */}
        {viewMode === "map" ? (
          <View style={styles.mapCard}>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={34} color={COLORS.navy} />
              <Text style={styles.mapTitle}>Map Preview</Text>
              <Text style={styles.mapSub}>
                Real map and clickable markers will be added next.
              </Text>

              <View style={styles.fakeMarkersWrap}>
                {filteredIssues.slice(0, 3).map((issue, index) => (
                  <Pressable
                    key={issue.id}
                    onPress={() => navigation.navigate("IssueDetails", { issue })}
                    style={[
                      styles.fakeMarker,
                      {
                        top: index === 0 ? 36 : index === 1 ? 96 : 58,
                        left: index === 0 ? 72 : index === 1 ? 210 : 155,
                      },
                    ]}
                  >
                    <Ionicons name="location" size={24} color={COLORS.orange} />
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={styles.mapUXHint}>
              UX choice: marker tap should first show a preview, then open full details.
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredIssues.map((issue) => (
              <Pressable
                key={issue.id}
                onPress={() => navigation.navigate("IssueDetails", { issue })}
                style={styles.issueCard}
              >
                <Image source={{ uri: issue.image }} style={styles.issueImage} />

                <View style={styles.issueRight}>
                  <View style={styles.topMetaRow}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(issue.status) },
                      ]}
                    >
                      {issue.status}
                    </Text>
                  </View>

                  <View style={styles.titlePriorityRow}>
                    <Text style={styles.issueTitle} numberOfLines={1}>
                      {issue.title}
                    </Text>
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(issue.priority) },
                      ]}
                    >
                      {issue.priority}
                    </Text>
                  </View>

                  <Text style={styles.issueDescription} numberOfLines={2}>
                    {issue.description}
                  </Text>

                  <View style={styles.bottomMetaRow}>
                    <Text style={styles.metaText}>{issue.location}</Text>
                    <Text style={styles.metaText}>{issue.date}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  headerSub: {
    marginTop: 4,
    color: COLORS.muted,
    fontWeight: "700",
  },
  notificationBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
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
  segmentBtnActive: {
    backgroundColor: COLORS.navy,
  },
  segmentText: {
    color: COLORS.navy,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#fff",
  },
  filtersRow: {
    gap: 10,
    paddingVertical: 16,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  filterChipText: {
    color: COLORS.text,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  mapPlaceholder: {
    height: 360,
    borderRadius: 16,
    backgroundColor: "#EAF1F7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  mapTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },
  mapSub: {
    marginTop: 6,
    color: COLORS.muted,
    textAlign: "center",
    paddingHorizontal: 20,
    fontWeight: "700",
  },
  fakeMarkersWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  fakeMarker: {
    position: "absolute",
  },
  mapUXHint: {
    marginTop: 12,
    color: COLORS.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  listWrap: {
    gap: 14,
  },
  issueCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  issueImage: {
    width: 118,
    height: 132,
  },
  issueRight: {
    flex: 1,
    padding: 12,
  },
  topMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  statusText: {
    fontWeight: "800",
    fontSize: 12,
  },
  titlePriorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  issueTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "900",
  },
  issueDescription: {
    marginTop: 8,
    color: COLORS.muted,
    fontWeight: "600",
    lineHeight: 18,
  },
  bottomMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
  },
});