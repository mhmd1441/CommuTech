import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
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

const GOVERNORATES_AR = [
  "بيروت",
  "جبل لبنان",
  "الشمال",
  "عكار",
  "البقاع",
  "بعلبك-الهرمل",
  "الجنوب",
  "النبطية",
  "الهرمل",
];

export default function SignupScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gov, setGov] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+961 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const phoneDigits = phone.replace(/[^\d]/g, "");
    const phoneOk = phoneDigits.startsWith("961") && phoneDigits.length >= 11;
    const passOk = password.length >= 8 && password === confirmPassword;
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      e.includes("@") &&
      gov.length > 0 &&
      address.trim().length >= 5 &&
      phoneOk &&
      passOk
    );
  }, [firstName, lastName, email, gov, address, phone, password, confirmPassword]);

  const onSignup = async () => {
    setError("");

    if (!canSubmit) {
      setError("Please fill all fields correctly.");
      return;
    }

    // TODO: call your backend API later
    // await authApi.register({ firstName, lastName, email, phone, gov, address, password })

    navigation.goBack();
  };

  const onPhoneChange = (val) => {
    if (!val.startsWith("+961")) {
      val = "+961 " + val.replace(/[^\d]/g, "").replace(/^961/, "");
    }
    const cleaned = "+961 " + val.replace("+961", "").replace(/[^\d]/g, "");
    setPhone(cleaned);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={COLORS.navy} />
          </Pressable>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join CommuTech to report and track issues.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Mohamad"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Moumneh"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Governorate (المحافظة)</Text>
          <View style={styles.dropdown}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {GOVERNORATES_AR.map((g) => {
                const active = gov === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGov(g)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
                    ]}
                  >
                    <Text style={[styles.chipText, active && { color: "#fff" }]}>{g}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          {!gov && <Text style={styles.hint}>Select one governorate.</Text>}

          <Text style={[styles.label, { marginTop: 12 }]}>Phone number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
            <TextInput
              value={phone}
              onChangeText={onPhoneChange}
              placeholder="+961 70 123 456"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
            />
          </View>
          <Text style={styles.hint}>Format: +961 followed by your number.</Text>

          <Text style={[styles.label, { marginTop: 12 }]}>Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="City, area, street, building…"
            placeholderTextColor="#94A3B8"
            style={[styles.input, { height: 52 }]}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 characters"
              placeholderTextColor="#94A3B8"
              secureTextEntry={secure}
              autoCapitalize="none"
              style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0, paddingRight: 40 }]}
            />
            <Pressable onPress={() => setSecure((s) => !s)} style={styles.eyeBtn} hitSlop={10}>
              <Ionicons name={secure ? "eye-outline" : "eye-off-outline"} size={18} color={COLORS.muted} />
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Confirm password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={secure2}
              autoCapitalize="none"
              style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0, paddingRight: 40 }]}
            />
            <Pressable onPress={() => setSecure2((s) => !s)} style={styles.eyeBtn} hitSlop={10}>
              <Ionicons name={secure2 ? "eye-outline" : "eye-off-outline"} size={18} color={COLORS.muted} />
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={onSignup}
            disabled={!canSubmit}
            style={[
              styles.signupBtn,
              !canSubmit && { opacity: 0.55 },
            ]}
          >
            <Text style={styles.signupBtnText}>Create account</Text>
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={{ color: COLORS.muted, fontWeight: "700" }}>Already have an account?</Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}> Login</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Suggestion: later you can add OTP (SMS) verification for stronger identity.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 18, paddingTop: 52, paddingBottom: 22 },
  header: { marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "900", color: COLORS.text, marginTop: 8 },
  subtitle: { color: COLORS.muted, marginTop: 6, fontWeight: "700" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 6, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: "#fff",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: "#fff",
    position: "relative",
  },
  eyeBtn: { position: "absolute", right: 12, height: 48, alignItems: "center", justifyContent: "center" },
  hint: { marginTop: 6, color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#fff",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
  },
  chipText: { fontWeight: "800", color: COLORS.text },
  error: { marginTop: 10, color: COLORS.danger, fontSize: 13, fontWeight: "700" },
  signupBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  signupBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  loginRow: { marginTop: 14, flexDirection: "row", justifyContent: "center" },
  loginLink: { color: COLORS.green, fontWeight: "900" },
  footerNote: { marginTop: 14, textAlign: "center", color: COLORS.muted, fontWeight: "600" },
});
