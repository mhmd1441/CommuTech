import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  Pressable, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  card: "#FFFFFF",
  softBlue: "#EAF1F7",
  softOrange: "#FFF7ED",
};

const SECTIONS = [
  {
    icon: "information-circle-outline",
    title: "About CommuTech",
    content:
      "CommuTech is a civic reporting platform designed to help residents report public infrastructure issues in Lebanon, including damaged roads, street lighting problems, waste accumulation, drainage concerns, and other community issues.\n\nCommuTech provides a digital channel for submitting, tracking, reviewing, and managing reports. It is not a government authority and does not directly perform repairs unless work is carried out by authorized municipal teams or assigned field workers.",
  },
  {
    icon: "checkmark-circle-outline",
    title: "Acceptance of These Terms",
    content:
      "By creating an account, submitting a report, or otherwise using CommuTech, you agree to these Terms of Service. If you do not agree with these terms, you should not use the platform.",
  },
  {
    icon: "person-outline",
    title: "Eligibility",
    bullets: [
      "You must be at least 13 years old to use CommuTech.",
      "You must submit reports only for areas where you live, work, pass through, or have a legitimate civic interest.",
      "The information you provide during registration, profile completion, and report submission must be accurate, current, and complete.",
    ],
  },
  {
    icon: "key-outline",
    title: "User Accounts",
    content:
      "You are responsible for protecting your account credentials and for all activity carried out through your account. You may not share your account with another person or access the platform using someone else's account.\n\nIf you believe your account has been compromised, contact CommuTech as soon as possible at support@commutech.lb.",
  },
  {
    icon: "create-outline",
    title: "Submitting Reports",
    bullets: [
      "Reports must describe a real and observable public issue.",
      "Report titles and descriptions must be clear, respectful, and relevant to the issue.",
      "Photos must relate directly to the reported issue and should be taken at or near the reported location.",
      "Location information must reasonably reflect where the issue exists.",
      "False, misleading, duplicated, or intentionally exaggerated reports are not permitted.",
      "Reports may not be used to harass, threaten, defame, or target individuals, workers, administrators, or public authorities.",
    ],
  },
  {
    icon: "image-outline",
    title: "Photos, Location, and Evidence",
    content:
      "Photos and location details help workers and administrators evaluate reports more accurately. By submitting this information, you confirm that it is relevant to the issue and that you have the right to share it through the platform.\n\nYou should avoid uploading photos that contain unnecessary personal information, private property details, faces, vehicle plates, or unrelated sensitive content whenever possible.",
  },
  {
    icon: "document-text-outline",
    title: "Content Ownership and License",
    content:
      "You retain ownership of the photos, descriptions, and other content you submit. By submitting content through CommuTech, you grant CommuTech a non-exclusive, royalty-free license to store, display, process, and share that content with authorized workers, administrators, and municipal authorities for the purpose of reviewing and resolving civic issues.\n\nReports and related content may be retained as part of the civic record even after an issue is resolved.",
  },
  {
    icon: "construct-outline",
    title: "Worker and Administrator Conduct",
    content:
      "Users with worker or administrator permissions must use those permissions only for legitimate platform operations. Workers should claim and update only issues they are authorized to handle and must provide accurate resolution notes when marking an issue as resolved.\n\nFalse resolutions, unauthorized access, misuse of citizen data, or manipulation of report status may result in suspension or removal of access.",
  },
  {
    icon: "ban-outline",
    title: "Prohibited Uses",
    bullets: [
      "Submitting spam, duplicate, fabricated, or frivolous reports.",
      "Impersonating another person, organization, worker, or authority.",
      "Attempting to access accounts, reports, systems, or data without authorization.",
      "Interfering with the platform's security, availability, or infrastructure.",
      "Uploading offensive, discriminatory, illegal, or unrelated content.",
      "Using CommuTech for any unlawful purpose under Lebanese law.",
    ],
  },
  {
    icon: "alert-circle-outline",
    title: "No Guarantee of Resolution",
    content:
      "CommuTech helps organize and communicate civic reports, but it cannot guarantee that any report will be accepted, assigned, repaired, or resolved within a specific timeframe. Resolution depends on available resources, municipal priorities, worker availability, and other factors outside CommuTech's direct control.",
    highlight: true,
  },
  {
    icon: "cloud-offline-outline",
    title: "Platform Availability",
    content:
      "CommuTech aims to provide a reliable service, but access may occasionally be interrupted due to maintenance, connectivity issues, third-party services, or technical problems. Features may be improved, modified, limited, or discontinued as the platform evolves.",
  },
  {
    icon: "shield-outline",
    title: "Limitation of Liability",
    content:
      "To the fullest extent permitted by Lebanese law, CommuTech and its operators are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. This includes reliance on report status, delays in resolution, unavailable services, inaccurate submissions, worker assignment errors, or data loss.",
  },
  {
    icon: "close-circle-outline",
    title: "Account Suspension and Termination",
    content:
      "CommuTech may suspend, restrict, or terminate accounts that violate these Terms, misuse platform features, submit abusive content, or create security or operational risk. Users may request account deletion by contacting support@commutech.lb. Personal data will be removed or anonymized within 30 days where applicable, while anonymized civic report data may be retained for public-interest and analytical purposes.",
  },
  {
    icon: "refresh-circle-outline",
    title: "Changes to These Terms",
    content:
      "CommuTech may update these Terms from time to time. When significant changes are made, users may be notified through the app or another appropriate channel. Continued use of CommuTech after an update means you accept the revised Terms.",
  },
  {
    icon: "globe-outline",
    title: "Governing Law",
    content:
      "These Terms are governed by the laws of the Republic of Lebanon. Any dispute arising from these Terms or from the use of CommuTech shall be subject to the competent courts of Lebanon.",
  },
  {
    icon: "mail-outline",
    title: "Contact",
    content: "For questions about these Terms:\n\nEmail: support@commutech.lb\nLocation: Beirut, Lebanon",
  },
];

function AccordionSection({ section, index }) {
  const [open, setOpen] = useState(index === 0);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.card, section.highlight && styles.cardHighlight]}>
      <Pressable onPress={toggle} style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, section.highlight && styles.cardIconWrapHighlight]}>
          <Ionicons
            name={section.icon}
            size={18}
            color={section.highlight ? C.orange : C.navy}
          />
        </View>
        <Text style={styles.cardTitle}>{section.title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
      </Pressable>

      {open && (
        <View style={styles.cardBody}>
          {section.content && (
            <Text style={styles.cardText}>{section.content}</Text>
          )}
          {section.bullets && section.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TermsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </Pressable>
        <Text style={styles.topBarTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="document-text" size={36} color={C.navy} />
          </View>
          <Text style={styles.bannerTitle}>Terms of Service</Text>
          <Text style={styles.bannerSub}>
            These terms explain the responsibilities, limits, and acceptable use rules that apply when using CommuTech.
          </Text>
          <View style={styles.bannerMeta}>
            <Ionicons name="calendar-outline" size={13} color={C.muted} />
            <Text style={styles.bannerMetaText}>Last updated: June 2026</Text>
          </View>
        </View>

        <View style={styles.sections}>
          {SECTIONS.map((section, i) => (
            <AccordionSection key={i} section={section} index={i} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  topBarTitle: { fontSize: 17, fontWeight: "900", color: C.text },
  scroll: { padding: 16, paddingBottom: 48 },

  banner: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  bannerIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: C.softBlue,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  bannerTitle: { fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 8 },
  bannerSub: {
    fontSize: 13, color: C.muted, fontWeight: "600",
    textAlign: "center", lineHeight: 20, marginBottom: 14,
  },
  bannerMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  bannerMetaText: { fontSize: 12, color: C.muted, fontWeight: "700" },

  sections: { gap: 10 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  cardHighlight: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFFBF5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.softBlue,
    alignItems: "center", justifyContent: "center",
  },
  cardIconWrapHighlight: { backgroundColor: "#FEF3E2" },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: C.text },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    gap: 6,
  },
  cardText: { fontSize: 13, color: C.muted, lineHeight: 21, fontWeight: "500" },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.navy, marginTop: 8,
  },
  bulletText: { flex: 1, fontSize: 13, color: C.muted, lineHeight: 21, fontWeight: "500" },
});
