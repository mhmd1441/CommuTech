import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../shared/BottomNav";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  red: "#B91C1C",
};

const CATEGORIES = ["Roads", "Lighting", "Traffic", "Environment", "Water", "Sanitation"];

export default function CreateIssueScreen({ navigation }) {
  const [category, setCategory] = useState("Roads");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Hamra, Beirut");
  const [photoReady, setPhotoReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(
    () =>
      category &&
      title.trim().length >= 5 &&
      description.trim().length >= 20 &&
      location.trim().length >= 4 &&
      photoReady,
    [category, title, description, location, photoReady]
  );

  const submitIssue = () => {
    if (!canSubmit) return;

    const issue = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      category,
      location,
      status: "Pending",
      priority: "Medium",
      date: "Today",
      image:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
    };

    setSubmitted(true);
    setTimeout(() => navigation.replace("IssueDetails", { issue }), 450);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Report Issue</Text>
              <Text style={styles.subtitle}>Capture real details for faster routing.</Text>
            </View>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={C.navy} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {CATEGORIES.map((item) => {
                const active = item === category;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCategory(item)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Large pothole near intersection"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <Text style={[styles.label, styles.mt]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what happened, how dangerous it is, and when you noticed it."
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, styles.mt]}>Live photo</Text>
            <Pressable
              onPress={() => setPhotoReady(true)}
              style={[styles.photoBox, photoReady && styles.photoBoxReady]}
            >
              <View style={styles.photoIcon}>
                <Ionicons
                  name={photoReady ? "checkmark-circle" : "camera-outline"}
                  size={30}
                  color={photoReady ? C.green : C.navy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoTitle}>
                  {photoReady ? "Photo captured" : "Open camera"}
                </Text>
                <Text style={styles.photoHint}>
                  Later this will use the device camera only, not gallery upload.
                </Text>
              </View>
            </Pressable>

            <Text style={[styles.label, styles.mt]}>Location</Text>
            <View style={styles.locationRow}>
              <View style={styles.locationInput}>
                <Ionicons name="location-outline" size={18} color={C.muted} />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Detect or enter location"
                  placeholderTextColor="#94A3B8"
                  style={styles.locationTextInput}
                />
              </View>
              <Pressable style={styles.locateBtn} onPress={() => setLocation("Hamra, Beirut")}>
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.aiCard}>
            <Ionicons name="sparkles-outline" size={20} color={C.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI triage later</Text>
              <Text style={styles.aiText}>
                This form is ready for image, text, and location scoring when the backend is connected.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={submitIssue}
            disabled={!canSubmit || submitted}
            style={[styles.submitBtn, (!canSubmit || submitted) && styles.submitBtnDisabled]}
          >
            <Text style={styles.submitText}>{submitted ? "Submitting..." : "Submit Report"}</Text>
          </Pressable>
        </ScrollView>

        <BottomNav navigation={navigation} activeTab="Report" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  root: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 116 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: "900", color: C.text },
  subtitle: { marginTop: 5, color: C.muted, fontWeight: "700" },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginBottom: 12 },
  label: { fontSize: 13, color: C.muted, fontWeight: "800", marginBottom: 8 },
  chips: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { color: C.text, fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
  },
  mt: { marginTop: 14 },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 15,
  },
  textarea: { minHeight: 112, paddingTop: 12, lineHeight: 20 },
  photoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  photoBoxReady: { borderColor: C.green, backgroundColor: "#ECFDF5" },
  photoIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  photoTitle: { color: C.text, fontSize: 15, fontWeight: "900" },
  photoHint: { marginTop: 4, color: C.muted, fontWeight: "600", lineHeight: 18 },
  locationRow: { flexDirection: "row", gap: 10 },
  locationInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  locationTextInput: { flex: 1, color: C.text, fontSize: 15 },
  locateBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCard: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  aiTitle: { color: C.text, fontWeight: "900" },
  aiText: { marginTop: 4, color: C.muted, fontWeight: "600", lineHeight: 18 },
  submitBtn: {
    marginTop: 14,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
