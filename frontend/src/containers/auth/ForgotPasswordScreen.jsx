import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
};

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const canSubmit = useMemo(() => {
    const value = email.trim();
    return value.length >= 5 && value.includes("@");
  }, [email]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we will send reset instructions when the API is connected.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={C.muted} />
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setSent(false);
              }}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          {sent && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={C.green} />
              <Text style={styles.successText}>Reset instructions are ready to send.</Text>
            </View>
          )}

          <Pressable
            onPress={() => setSent(true)}
            disabled={!canSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          >
            <Text style={styles.submitText}>Send Reset Link</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 18, paddingTop: 54 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { marginTop: 22, marginBottom: 16 },
  title: { fontSize: 28, color: C.text, fontWeight: "900" },
  subtitle: { marginTop: 8, color: C.muted, fontWeight: "700", lineHeight: 21 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  label: { color: C.muted, fontWeight: "800", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: C.text, fontSize: 15 },
  successBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
  },
  successText: { color: C.green, fontWeight: "800", flex: 1 },
  submitBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
