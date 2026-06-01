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
      "CommuTech is a civic reporting platform that enables residents of Lebanon to report public infrastructure issues — such as damaged roads, broken streetlights, waste accumulation, and drainage problems — to relevant municipal authorities and assigned field workers.\n\nCommuTech acts solely as an intermediary platform and does not itself carry out repairs or guarantee that reported issues will be resolved by government or municipal bodies.",
  },
  {
    icon: "person-outline",
    title: "Eligibility",
    bullets: [
      "You must be at least 13 years of age to use CommuTech.",
      "You must reside in or have a legitimate civic interest in the area where you submit reports.",
      "By registering, you confirm that the information you provide is accurate and complete.",
    ],
  },
  {
    icon: "key-outline",
    title: "User Accounts",
    content:
      "You are responsible for maintaining the confidentiality of your account credentials. You may not share your account with others or use another person's account. You are responsible for all activity that occurs under your account.\n\nIf you believe your account has been compromised, contact CommuTech immediately at support@commutech.lb.",
  },
  {
    icon: "create-outline",
    title: "Submitting Reports",
    bullets: [
      "Reports must describe a real, observable public issue in Lebanon.",
      "Photos submitted must be relevant to the issue and taken at or near the reported location.",
      "Location data must accurately reflect where the issue exists.",
      "CommuTech does not allow false, misleading, or fabricated reports.",
      "Reports may not be used as a means of harassing individuals, workers, or authorities.",
      "Reports containing offensive, discriminatory, or illegal content will be removed.",
    ],
  },
  {
    icon: "document-text-outline",
    title: "Content Ownership and License",
    content:
      "You retain ownership of the photos and descriptions you submit. However, by submitting a report, you grant CommuTech a non-exclusive, royalty-free license to store, display, and share your submitted content with municipal authorities, assigned workers, and administrators for the purpose of resolving the reported issue.\n\nReports and associated content may be retained as part of the public civic record even after an issue is resolved.",
  },
  {
    icon: "construct-outline",
    title: "Worker and Administrator Conduct",
    content:
      "Users assigned the Worker role agree to only claim and resolve issues within their area of competence. Workers must provide accurate resolution notes when marking an issue as resolved. Misuse of the worker role — including false resolutions or unauthorized data access — may result in immediate account suspension.",
  },
  {
    icon: "ban-outline",
    title: "Prohibited Uses",
    bullets: [
      "Submitting spam, duplicate, or frivolous reports.",
      "Impersonating another person or organization.",
      "Attempting to gain unauthorized access to other accounts or backend systems.",
      "Interfering with or disrupting the platform's infrastructure.",
      "Using the platform for any unlawful purpose under Lebanese law.",
    ],
  },
  {
    icon: "alert-circle-outline",
    title: "No Guarantee of Resolution",
    content:
      "CommuTech facilitates the reporting of civic issues but does not guarantee that any reported issue will be resolved, reviewed, or acted upon by municipal authorities or workers. Resolution depends on third-party governmental bodies and field workers outside CommuTech's direct control.",
    highlight: true,
  },
  {
    icon: "shield-outline",
    title: "Limitation of Liability",
    content:
      "To the fullest extent permitted by Lebanese law, CommuTech and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including reliance on unresolved reports, inaccurate worker assignments, or data loss.",
  },
  {
    icon: "close-circle-outline",
    title: "Account Suspension and Termination",
    content:
      "CommuTech reserves the right to suspend or permanently terminate any account that violates these Terms, without prior notice. Users may request account deletion by contacting support@commutech.lb. Upon deletion, personal data will be removed within 30 days, though anonymized civic report data may be retained.",
  },
  {
    icon: "refresh-circle-outline",
    title: "Changes to These Terms",
    content:
      "CommuTech may update these Terms from time to time. You will be notified of significant changes through the app. Continued use of CommuTech after changes are published constitutes acceptance of the updated Terms.",
  },
  {
    icon: "globe-outline",
    title: "Governing Law",
    content:
      "These Terms are governed by and construed in accordance with the laws of the Republic of Lebanon. Any disputes arising from these Terms or your use of CommuTech shall be subject to the exclusive jurisdiction of Lebanese courts.",
  },
  {
    icon: "mail-outline",
    title: "Contact",
    content: "For any questions regarding these Terms:\n\nEmail: support@commutech.lb\nLocation: Beirut, Lebanon",
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
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="document-text" size={36} color={C.navy} />
          </View>
          <Text style={styles.bannerTitle}>Terms of Service</Text>
          <Text style={styles.bannerSub}>
            By using CommuTech, you agree to these terms. Tap any section to read more.
          </Text>
          <View style={styles.bannerMeta}>
            <Ionicons name="calendar-outline" size={13} color={C.muted} />
            <Text style={styles.bannerMetaText}>Last updated: May 2026</Text>
          </View>
        </View>

        {/* Accordion sections */}
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
