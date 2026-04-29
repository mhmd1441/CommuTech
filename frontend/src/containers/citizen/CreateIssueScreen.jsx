import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import BottomNav from "../shared/BottomNav";
import api from "../../services/api";

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
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  const canSubmit = useMemo(
    () =>
      category &&
      title.trim().length >= 5 &&
      description.trim().length >= 20 &&
      location.trim().length >= 4,
    [category, title, description, location]
  );

const searchLocation = (text) => {
    setLocation(text);
    if (latitude !== null || longitude !== null) {
      setLatitude(null);
      setLongitude(null);
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&countrycodes=lb&accept-language=en`,
          { headers: { "User-Agent": "CommuTech/1.0" } }
        );
        const results = await response.json();
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 500);
  };

  const detectLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Allow location access to auto-detect your position.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { "Accept-Language": "en", "User-Agent": "CommuTech/1.0" } }
        );
        const geo = await response.json();
        if (geo?.address) {
          const a = geo.address;
          const readable = [
            a.amenity || a.building || a.tourism || a.shop,
            a.suburb || a.neighbourhood || a.quarter,
            a.city || a.town || a.village,
          ].filter(Boolean).join(", ");
          setLocation(readable.length > 3 ? readable : geo.display_name.split(",").slice(0, 3).join(",").trim());
        } else {
          setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      Alert.alert("Error", "Could not detect location. Please enter it manually.");
    } finally {
      setLocating(false);
    }
  };

  const submitIssue = async () => {
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        ...(latitude && longitude ? { latitude, longitude } : {}),
      };

      const { data } = await api.post("/issues", payload);

      setSubmitted(true);
      setTimeout(() => navigation.replace("IssueDetails", { issue: data }), 300);
    } catch (err) {
      Alert.alert("Submission Failed", err.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
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

          {/* Category */}
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
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Form */}
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

            <Text style={[styles.label, styles.mt]}>Location</Text>
            <View style={styles.locationRow}>
              <View style={styles.locationInput}>
                <Ionicons name="location-outline" size={18} color={C.muted} />
                <TextInput
                  value={location}
                  onChangeText={searchLocation}
                  placeholder="Detect or enter location"
                  placeholderTextColor="#94A3B8"
                  style={styles.locationTextInput}
                />
              </View>
              <Pressable style={styles.locateBtn} onPress={detectLocation} disabled={locating}>
                {locating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="navigate" size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            {showSuggestions && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s.place_id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setLocation(s.display_name.split(",").slice(0, 3).join(",").trim());
                      setLatitude(parseFloat(s.lat));
                      setLongitude(parseFloat(s.lon));
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                  >
                    <Ionicons name="location-outline" size={14} color={C.muted} />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {s.display_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Show coordinates if detected */}
            {latitude && longitude && (
              <View style={styles.coordsBox}>
                <Ionicons name="checkmark-circle" size={16} color={C.green} />
                <Text style={styles.coordsText}>
                  GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </Text>
              </View>
            )}
          </View>

          {/* AI card */}
          <View style={styles.aiCard}>
            <Ionicons name="sparkles-outline" size={20} color={C.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI Triage Active</Text>
              <Text style={styles.aiText}>
                Your issue will be automatically prioritized by the backend based on category and description.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={submitIssue}
            disabled={!canSubmit || submitting || submitted}
            style={[styles.submitBtn, (!canSubmit || submitting || submitted) && styles.submitBtnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{submitted ? "Submitted!" : "Submit Report"}</Text>
            )}
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
    width: 42, height: 42, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.card,
    alignItems: "center", justifyContent: "center",
  },
  section: { marginBottom: 12 },
  label: { fontSize: 13, color: C.muted, fontWeight: "800", marginBottom: 8 },
  chips: { gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { color: C.text, fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },
  card: {
    backgroundColor: C.card, borderWidth: 1,
    borderColor: C.border, borderRadius: 18, padding: 16,
  },
  mt: { marginTop: 14 },
  input: {
    minHeight: 50, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, backgroundColor: "#FFFFFF",
    paddingHorizontal: 12, color: C.text, fontSize: 15,
  },
  textarea: { minHeight: 112, paddingTop: 12, lineHeight: 20 },
  locationRow: { flexDirection: "row", gap: 10 },
  locationInput: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    minHeight: 50, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, paddingHorizontal: 12, backgroundColor: "#FFFFFF",
  },
  locationTextInput: { flex: 1, color: C.text, fontSize: 15 },
  locateBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: C.navy, alignItems: "center", justifyContent: "center",
  },
  coordsBox: {
    marginTop: 8, flexDirection: "row", alignItems: "center",
    gap: 6, padding: 8, backgroundColor: "#ECFDF5",
    borderRadius: 10, borderWidth: 1, borderColor: "#BBF7D0",
  },
  coordsText: { fontSize: 12, color: C.green, fontWeight: "700" },
  suggestionsBox: {
    marginTop: 6, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, backgroundColor: "#fff", overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  suggestionText: { flex: 1, fontSize: 13, color: C.text, fontWeight: "600" },
  aiCard: {
    marginTop: 12, flexDirection: "row", gap: 12,
    backgroundColor: "#FFF7ED", borderColor: "#FED7AA",
    borderWidth: 1, borderRadius: 16, padding: 14,
  },
  aiTitle: { color: C.text, fontWeight: "900" },
  aiText: { marginTop: 4, color: C.muted, fontWeight: "600", lineHeight: 18 },
  submitBtn: {
    marginTop: 14, height: 54, borderRadius: 16,
    backgroundColor: C.navy, alignItems: "center", justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});