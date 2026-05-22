import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../../services/api";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#B91C1C",
};

const STEPS = [
  { icon: "mail-outline",           title: "Forgot Password",    sub: "Enter your account email and CommuTech will send you a 6-digit reset code." },
  { icon: "keypad-outline",         title: "Enter Reset Code",   sub: "Check your inbox. Enter the 6-digit code we sent to your email." },
  { icon: "lock-closed-outline",    title: "New Password",       sub: "Choose a strong new password for your CommuTech account." },
];

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep]                 = useState(0);
  const [email, setEmail]               = useState("");
  const [otp, setOtp]                   = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [secure, setSecure]             = useState(true);
  const [secure2, setSecure2]           = useState(true);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const clearError = () => setError("");

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) { setError("Enter a valid email address."); return; }
    try {
      setLoading(true); clearError();
      await authApi.sendOtp(trimmed);
      setStep(1);
    } catch (e) {
      setError(e.message || "Could not send code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError("Enter the full 6-digit code."); return; }
    try {
      setLoading(true); clearError();
      await authApi.verifyOtp(email.trim().toLowerCase(), otp);
      setStep(2);
    } catch (e) {
      setError(e.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    try {
      setLoading(true); clearError();
      await authApi.resetPassword(email.trim().toLowerCase(), otp, password);
      setStep(3);
    } catch (e) {
      setError(e.message || "Reset failed. The code may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true); clearError();
      await authApi.sendOtp(email.trim().toLowerCase());
      setError("");
      setOtp("");
    } catch (e) {
      setError(e.message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={styles.root}>
        <View style={styles.successScreen}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={64} color={C.green} />
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSub}>
            Your CommuTech password has been updated. You can now log in with your new password.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.replace("Login")}>
            <Text style={styles.primaryBtnText}>Back to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const current = STEPS[step];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Back button */}
        <Pressable
          onPress={() => step === 0 ? navigation.goBack() : setStep((s) => s - 1)}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </Pressable>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={28} color={C.navy} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.sub}>{current.sub}</Text>
          {step >= 1 && (
            <View style={styles.emailBadge}>
              <Ionicons name="mail-outline" size={13} color={C.navy} />
              <Text style={styles.emailBadgeText}>{email}</Text>
            </View>
          )}
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Step 0 — Email */}
          {step === 0 && (
            <>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={C.muted} />
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearError(); }}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            </>
          )}

          {/* Step 1 — OTP */}
          {step === 1 && (
            <>
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
              <Pressable onPress={handleResend} disabled={loading} style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive a code? </Text>
                <Text style={styles.resendLink}>Resend</Text>
              </Pressable>
            </>
          )}

          {/* Step 2 — New password */}
          {step === 2 && (
            <>
              <Text style={styles.label}>New password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={C.muted} />
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearError(); }}
                  placeholder="Min 8 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Pressable onPress={() => setSecure((s) => !s)} hitSlop={10}>
                  <Ionicons name={secure ? "eye-outline" : "eye-off-outline"} size={18} color={C.muted} />
                </Pressable>
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Confirm password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color={C.muted} />
                <TextInput
                  value={confirm}
                  onChangeText={(v) => { setConfirm(v); clearError(); }}
                  placeholder="Repeat password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={secure2}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Pressable onPress={() => setSecure2((s) => !s)} hitSlop={10}>
                  <Ionicons name={secure2 ? "eye-outline" : "eye-off-outline"} size={18} color={C.muted} />
                </Pressable>
              </View>
            </>
          )}

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action button */}
          <Pressable
            onPress={step === 0 ? handleSendOtp : step === 1 ? handleVerifyOtp : handleResetPassword}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>
                  {step === 0 ? "Send Code" : step === 1 ? "Verify Code" : "Reset Password"}
                </Text>
            }
          </Pressable>

          {step === 0 && (
            <Pressable onPress={() => navigation.goBack()} style={styles.backToLogin}>
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 52, paddingBottom: 32 },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  stepRow: { flexDirection: "row", gap: 6, marginTop: 20, marginBottom: 4 },
  stepDot: {
    width: 28, height: 4, borderRadius: 2, backgroundColor: C.border,
  },
  stepDotActive: { backgroundColor: C.navy },
  header: { marginTop: 20, marginBottom: 20 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "#EAF1F7",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: "900", color: C.text },
  sub: { marginTop: 8, color: C.muted, fontWeight: "600", lineHeight: 21 },
  emailBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 12, backgroundColor: "#EAF1F7",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: "flex-start",
  },
  emailBadgeText: { fontSize: 13, color: C.navy, fontWeight: "800" },
  card: {
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  label: { color: C.muted, fontWeight: "800", marginBottom: 8, fontSize: 13 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, height: 50, paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  input: { flex: 1, color: C.text, fontSize: 15 },
  otpInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    height: 64, textAlign: "center", fontSize: 32,
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
  backToLogin: { marginTop: 12, alignItems: "center" },
  backToLoginText: { color: C.muted, fontWeight: "700", fontSize: 13 },

  // Success screen
  successScreen: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 32,
  },
  successIconWrap: {
    width: 100, height: 100, borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  successTitle: { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 12 },
  successSub: {
    fontSize: 14, color: C.muted, fontWeight: "600",
    textAlign: "center", lineHeight: 22, marginBottom: 32,
  },
});
