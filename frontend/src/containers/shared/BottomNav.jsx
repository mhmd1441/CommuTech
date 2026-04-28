import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
};

export default function BottomNav({ navigation, activeTab = "Home" }) {
  const tabs = [
    {
      key: "Home",
      label: "Home",
      icon: activeTab === "Home" ? "home" : "home-outline",
      screen: "CitizenHome",
    },
    {
      key: "Report",
      label: "Report",
      icon: activeTab === "Report" ? "add-circle" : "add-circle-outline",
      screen: "CreateIssue",
      accent: true,
    },
    {
      key: "MyReports",
      label: "Reports",
      icon:
        activeTab === "MyReports"
          ? "document-text"
          : "document-text-outline",
      screen: "MyReports",
    },
    {
      key: "Profile",
      label: "Profile",
      icon: activeTab === "Profile" ? "person" : "person-outline",
      screen: "Profile",
    },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => navigation.navigate(tab.screen)}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              {active && <View style={styles.activeRail} />}
              <View
                style={[
                  styles.iconBox,
                  active && styles.iconBoxActive,
                  tab.accent && !active && styles.iconBoxAccent,
                  tab.accent && styles.reportIconBox,
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={tab.accent ? 25 : 21}
                  color={
                    active
                      ? "#FFFFFF"
                      : tab.accent
                      ? COLORS.orange
                      : COLORS.muted
                  }
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                  tab.accent && !active && { color: COLORS.orange },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === "ios" ? 22 : 12,
  },
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 9,
    paddingHorizontal: 6,
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
    position: "relative",
  },
  activeRail: {
    position: "absolute",
    top: -9,
    width: 26,
    height: 3,
    borderRadius: 999,
    backgroundColor: COLORS.navy,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 4,
  },
  iconBoxActive: {
    backgroundColor: COLORS.navy,
  },
  reportIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    marginTop: -8,
  },
  iconBoxAccent: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  tabLabelActive: {
    color: COLORS.navy,
  },
});
