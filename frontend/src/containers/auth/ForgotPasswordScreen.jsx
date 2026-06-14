import React, { useState, useEffect } from "react";
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

export default function ForgotPasswordScreen({ navigation, route }) {
  const [step, setStep]                 = useState(0);
  const [email, setEmail]               = useState(route.params?.email ?? "");
  const [otp, setOtp]                   = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [secure, setSecure]             = useState(true);
  const [secure2, setSecure2]           = useState(true);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const clearError = () => setError("");

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) { setError("Enter a valid email address."); return; }
    try {
      setLoading(true); clearError();
      await authApi.sendOtp(trimmed);
      setResendCooldown(60);
      setStep(1);
    } catch (e) {
      if (e.retryAfter) setResendCooldown(e.retryAfter);
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
    if (resendCooldown > 0) return;
    try {
      setLoading(true); clearError();
      await authApi.sendOtp(email.trim().toLowerCase());
      setOtp("");
      setResendCooldown(60);
    } catch (e) {
      if (e.retryAfter) setResendCooldown(e.retryAfter);
      setError(e.message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength (step 2) ─────────────────────────────────────────────
  const pwHasUpper   = /[A-Z]/.test(password);
  const pwHasNumber  = /[0-9]/.test(password);
  const pwLongEnough = password.length >= 8;
  const pwScore      = [pwLongEnough, pwHasUpper, pwHasNumber].filter(Boolean).length;
  const strengthMeta = password.length === 0 ? null
    : pwScore === 1 ? { pct: 1, color: C.danger,  label: "Weak"   }
    : pwScore === 2 ? { pct: 2, color: C.orange,  label: "Fair"   }
    :                 { pct: 3, color: C.green,   label: "Strong" };
  const passwordsMatch    = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={styles.root}>
        <View style={styles.successTopBg} />
        <View style={styles.successScreen}>

          <View style={styles.successRingOuter}>
            <View style={styles.successRingInner}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={52} color="#fff" />
              </View>
            </View>
          </View>

          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSub}>
            Your CommuTech password has been updated successfully.
          </Text>

          <View style={styles.successCard}>
            <View style={styles.successBadgeRow}>
              <Ionicons name="shield-checkmark" size={16} color={C.green} />
              <Text style={styles.successBadgeText}>Account Secured</Text>
            </View>

            <View style={styles.successDivider} />

            <Pressable
              style={({ pressed }) => [styles.successBtn, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.replace("Login")}
            >
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.successBtnText}>Back to Login</Text>
            </Pressable>

            <Text style={styles.successHint}>
              You can now sign in with your new password.
            </Text>
          </View>

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
            </>
          )}

          {/* Step 2 — New password */}
          {step === 2 && (
            <>
              <Text style={styles.label}>New password</Text>
              <View style={[
                styles.inputWrap,
                strengthMeta && { borderColor: strengthMeta.color },
              ]}>
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

              {/* Strength bar */}
              {strengthMeta && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3].map((threshold) => (
                      <View
                        key={threshold}
                        style={[
                          styles.strengthSegment,
                          { backgroundColor: pwScore >= threshold ? strengthMeta.color : C.border },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthMeta.color }]}>
                    {strengthMeta.label}
                  </Text>
                </View>
              )}

              {/* Requirements */}
              <View style={styles.requirementsBox}>
                {[
                  { met: pwLongEnough, label: "At least 8 characters" },
                  { met: pwHasUpper,   label: "One uppercase letter"  },
                  { met: pwHasNumber,  label: "One number"            },
                ].map(({ met, label }) => (
                  <View key={label} style={styles.requirementRow}>
                    <Ionicons
                      name={met ? "checkmark-circle" : "ellipse-outline"}
                      size={13}
                      color={met ? C.green : C.muted}
                    />
                    <Text style={[styles.requirementText, { color: met ? C.green : C.muted }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 18 }]}>Confirm password</Text>
              <View style={[
                styles.inputWrap,
                passwordsMatch    && { borderColor: C.green  },
                passwordsMismatch && { borderColor: C.danger },
              ]}>
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

              {/* Match status */}
              {confirm.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons
                    name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                    size={13}
                    color={passwordsMatch ? C.green : C.danger}
                  />
                  <Text style={[styles.matchText, { color: passwordsMatch ? C.green : C.danger }]}>
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </Text>
                </View>
              )}
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

  // Step 2 — strength & match
  strengthRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
  },
  strengthBars: { flex: 1, flexDirection: "row", gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "800", minWidth: 42, textAlign: "right" },
  requirementsBox: { marginTop: 10, gap: 5 },
  requirementRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  requirementText: { fontSize: 12, fontWeight: "600" },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  matchText: { fontSize: 12, fontWeight: "700" },

  // Success screen
  successTopBg: {
    position: "absolute", top: 0, left: 0, right: 0, height: "48%",
    backgroundColor: "#EAF1F7",
    borderBottomLeftRadius: 48, borderBottomRightRadius: 48,
  },
  successScreen: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 28,
  },
  successRingOuter: {
    width: 168, height: 168, borderRadius: 84,
    backgroundColor: "rgba(74,168,92,0.10)",
    alignItems: "center", justifyContent: "center", marginBottom: 32,
  },
  successRingInner: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: "rgba(74,168,92,0.20)",
    alignItems: "center", justifyContent: "center",
  },
  successIconCircle: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
  },
  successTitle: {
    fontSize: 30, fontWeight: "900", color: C.text,
    textAlign: "center", marginBottom: 10,
  },
  successSub: {
    fontSize: 15, color: C.muted, fontWeight: "600",
    textAlign: "center", lineHeight: 24, marginBottom: 36,
  },
  successCard: {
    width: "100%", backgroundColor: C.card,
    borderRadius: 22, borderWidth: 1, borderColor: C.border,
    padding: 20,
  },
  successBadgeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingBottom: 16,
  },
  successBadgeText: { color: C.green, fontWeight: "800", fontSize: 14 },
  successDivider: { height: 1, backgroundColor: C.border, marginBottom: 16 },
  successBtn: {
    height: 54, borderRadius: 16, backgroundColor: C.navy,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  successBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  successHint: {
    marginTop: 14, textAlign: "center",
    color: C.muted, fontWeight: "600", fontSize: 13,
  },
});
