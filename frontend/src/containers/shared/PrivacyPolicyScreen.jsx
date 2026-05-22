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
  navy2: "#1A4672",
  green: "#4AA85C",
  bg: "#F7FAFC",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  card: "#FFFFFF",
  softBlue: "#EAF1F7",
};

const SECTIONS = [
  {
    icon: "list-outline",
    title: "Data CommuTech Collects",
    bullets: [
      "Account details: first name, last name, email, phone number, governorate, and password (stored as a secure hash — never in plain text).",
      "Profile details: father name, city, street, building, and profile picture (all optional).",
      "Report content: issue title, description, category, photos, and GPS coordinates you submit.",
      "Location data: GPS coordinates collected only at the moment of report submission, with your explicit permission. CommuTech does not track your location in the background.",
      "Usage data: actions inside the app such as reports submitted, notifications received, and status updates viewed.",
    ],
  },
  {
    icon: "help-circle-outline",
    title: "Why CommuTech Collects This",
    bullets: [
      "To create and manage your account.",
      "To process civic reports and route them to the correct municipal workers.",
      "To send you status notifications about your submitted reports.",
      "To display issues on the civic map for transparency and tracking.",
      "To improve platform accuracy and service quality over time.",
      "To comply with applicable Lebanese laws and regulations.",
    ],
  },
  {
    icon: "server-outline",
    title: "How Your Data Is Stored",
    content:
      "All data is stored securely on Supabase cloud infrastructure hosted in the EU (North Europe region), which follows industry-standard encryption at rest and in transit.\n\nPasswords are hashed using bcrypt and are never readable — not even by administrators.\n\nPhotos submitted with reports are stored in Supabase Storage and are accessible via public URLs to enable display within the app.",
  },
  {
    icon: "people-outline",
    title: "Who Can See Your Data",
    bullets: [
      "Assigned workers: can see your report content, photos, and location. Your name may be visible to them for follow-up.",
      "Administrators: can access all reports and user accounts for moderation and platform operations.",
      "Municipal authorities: may receive anonymized or attributed report data to facilitate infrastructure repairs.",
    ],
    note: "CommuTech does not sell, rent, or trade your personal information to any third party for commercial purposes.",
  },
  {
    icon: "location-outline",
    title: "Location Data",
    content:
      "CommuTech requests GPS access only when you are actively submitting a report. You may also type a location manually without granting GPS access at all. CommuTech never collects background location data.",
  },
  {
    icon: "image-outline",
    title: "Photos and Media",
    content:
      "Photos you attach to reports are stored permanently as part of the civic record. They are visible to workers, administrators, and potentially municipal authorities. Once a report has been acted upon, its photos may not be deleted.",
  },
  {
    icon: "time-outline",
    title: "Data Retention",
    bullets: [
      "Active reports and associated data are retained indefinitely as part of the civic record.",
      "If you request account deletion, your personal identifying information will be removed within 30 days.",
      "Anonymized report data (location, category, resolution notes) may be retained for statistical purposes after account deletion.",
    ],
  },
  {
    icon: "shield-checkmark-outline",
    title: "Your Rights",
    bullets: [
      "Access the personal data CommuTech holds about you.",
      "Request correction of inaccurate information.",
      "Request deletion of your account and personal data.",
      "Withdraw GPS location consent at any time through your device settings.",
    ],
    note: "To exercise any of these rights, contact: privacy@commutech.lb",
  },
  {
    icon: "person-remove-outline",
    title: "Children's Privacy",
    content:
      "CommuTech is not directed at children under the age of 13. CommuTech does not knowingly collect personal data from children. If you believe a child has created an account, contact privacy@commutech.lb and the account will be deleted promptly.",
  },
  {
    icon: "lock-closed-outline",
    title: "Security",
    content:
      "CommuTech implements appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure.",
  },
  {
    icon: "refresh-outline",
    title: "Changes to This Policy",
    content:
      "CommuTech may update this Privacy Policy periodically. You will be notified through the app when significant changes are made. Continued use of CommuTech after updates constitutes acceptance of the revised policy.",
  },
  {
    icon: "globe-outline",
    title: "Governing Law",
    content:
      "This Privacy Policy is governed by the laws of the Republic of Lebanon. Any disputes shall be subject to the exclusive jurisdiction of Lebanese courts.",
  },
  {
    icon: "mail-outline",
    title: "Contact",
    content: "For any questions or data requests:\n\nEmail: privacy@commutech.lb\nLocation: Beirut, Lebanon",
  },
];

function AccordionSection({ section, index }) {
  const [open, setOpen] = useState(index === 0);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={section.icon} size={18} color={C.navy} />
        </View>
        <Text style={styles.cardTitle}>{section.title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={C.muted}
        />
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
          {section.note && (
            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={15} color={C.navy} />
              <Text style={styles.noteText}>{section.note}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </Pressable>
        <Text style={styles.topBarTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="shield-checkmark" size={36} color={C.navy} />
          </View>
          <Text style={styles.bannerTitle}>Your Privacy Matters</Text>
          <Text style={styles.bannerSub}>
            CommuTech is committed to protecting your personal data. Tap any section below to read more.
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
  noteBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: C.softBlue, borderRadius: 10, padding: 10, marginTop: 4,
  },
  noteText: { flex: 1, fontSize: 12, color: C.navy, fontWeight: "700", lineHeight: 18 },
});
