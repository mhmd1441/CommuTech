import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { emailVerificationApi } from "../../services/api";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#B91C1C",
};

export default function EmailVerificationScreen({ navigation, route }) {
  const email = route.params?.email ?? "";

  const [otp, setOtp]                       = useState("");
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const clearError = () => setError("");

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("Enter the full 6-digit code."); return; }
    try {
      setLoading(true); clearError();
      await emailVerificationApi.verify(email, otp);
      navigation.replace("CitizenHome");
    } catch (e) {
      setError(e.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true); clearError();
      await emailVerificationApi.resend(email);
      setOtp("");
      setResendCooldown(60);
    } catch (e) {
      if (e.retryAfter) setResendCooldown(e.retryAfter);
      setError(e.message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail-open-outline" size={30} color={C.navy} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.sub}>
            We sent a 6-digit code to
          </Text>
          <View style={styles.emailBadge}>
            <Ionicons name="mail-outline" size={13} color={C.navy} />
            <Text style={styles.emailBadgeText}>{email}</Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.label}>6-digit code</Text>
          <TextInput
            value={otp}
            onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, "").slice(0, 6)); clearError(); }}
            placeholder="000000"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
          />

          <Pressable
            onPress={handleResend}
            disabled={loading || resendCooldown > 0}
            style={styles.resendRow}
          >
            <Text style={styles.resendText}>Didn't receive a code? </Text>
            {resendCooldown > 0
              ? <Text style={[styles.resendLink, { color: C.muted }]}>Resend in {resendCooldown}s</Text>
              : <Text style={styles.resendLink}>Resend</Text>
            }
          </Pressable>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleVerify}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Verify & Create Account</Text>
            }
          </Pressable>

          <Pressable onPress={() => navigation.replace("Signup")} style={styles.backRow}>
            <Text style={styles.backText}>Wrong email? Go back</Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 64, paddingBottom: 32 },
  header: { marginBottom: 28 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "#EAF1F7",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "900", color: C.text, marginBottom: 8 },
  sub: { color: C.muted, fontWeight: "600", fontSize: 14 },
  emailBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, backgroundColor: "#EAF1F7",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: "flex-start",
  },
  emailBadgeText: { fontSize: 13, color: C.navy, fontWeight: "800" },
  card: {
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  label: { color: C.muted, fontWeight: "800", marginBottom: 8, fontSize: 13 },
  otpInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    height: 68, textAlign: "center", fontSize: 34,
    fontWeight: "900", color: C.navy, letterSpacing: 12,
    backgroundColor: "#fff",
  },
  resendRow: {
    flexDirection: "row", justifyContent: "center",
    marginTop: 12, alignItems: "center",
  },
  resendText: { color: C.muted, fontWeight: "600", fontSize: 13 },
  resendLink: { color: C.navy, fontWeight: "900", fontSize: 13 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12, backgroundColor: "#FEF2F2",
    borderRadius: 10, padding: 10,
  },
  errorText: { flex: 1, color: C.danger, fontWeight: "700", fontSize: 13 },
  primaryBtn: {
    marginTop: 16, height: 52, borderRadius: 16,
    backgroundColor: C.navy, alignItems: "center", justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  backRow: { marginTop: 12, alignItems: "center" },
  backText: { color: C.muted, fontWeight: "700", fontSize: 13 },
});
