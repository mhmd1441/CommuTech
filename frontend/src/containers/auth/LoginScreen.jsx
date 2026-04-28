import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  navy: "#19405F",
  navy2: "#1A4672",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const shimmerX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (!loading) return;

    shimmerX.setValue(-1);
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [loading]);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length >= 5 && e.includes("@") && password.length >= 6 && !loading;
  }, [email, password, loading]);

  const onLogin = async () => {
    setError("");

    if (!canSubmit) {
      setError("Please enter a valid email and password (min 6 chars).");
      return;
    }

    try {
      setLoading(true);

      // TODO: Replace with real API call
      // await authApi.login({ email, password });

      await new Promise((r) => setTimeout(r, 1200));
      navigation.replace("CitizenHome");
    } catch (e) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.touchArea}>
          <View style={styles.topGlow} />

          <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CommuTech</Text>
          <Text style={styles.subtitle}>Smart Civic Reporting</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={COLORS.muted}
              style={styles.leftIcon}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.muted}
              style={styles.leftIcon}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={secure}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { paddingRight: 44 }]}
            />
            <Pressable
              onPress={() => setSecure((s) => !s)}
              style={styles.eyeBtn}
              hitSlop={10}
            >
              <Ionicons
                name={secure ? "eye-outline" : "eye-off-outline"}
                size={18}
                color={COLORS.muted}
              />
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={() => {
              navigation.navigate("ForgotPassword");
            }}
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            onPress={onLogin}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.loginBtn,
              !canSubmit && styles.loginBtnDisabled,
              pressed && canSubmit && { transform: [{ scale: 0.99 }] },
            ]}
          >
            {loading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loginBtnText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
            )}
          </Pressable>

          {loading && (
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.shimmer,
                  {
                    transform: [
                      {
                        translateX: shimmerX.interpolate({
                          inputRange: [-1, 1],
                          outputRange: [-220, 220],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            onPress={() => {
              Alert.alert(
                "Google sign-in",
                "Google login needs backend OAuth setup, so it is only a placeholder for now."
              );
            }}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="logo-google" size={18} color={COLORS.text} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupHint}>Don't have an account?</Text>
            <Pressable
              onPress={() => {
                navigation.navigate("Signup");
              }}
            >
              <Text style={styles.signupLink}> Sign up</Text>
            </Pressable>
          </View>
        </View>

            <Text style={styles.footer}>Built for safer, smarter communities.</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  touchArea: {
    flex: 1,
  },
  topGlow: {
    position: "absolute",
    top: -120,
    left: -80,
    right: -80,
    height: 260,
    backgroundColor: COLORS.navy,
    opacity: 0.1,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 54,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: -2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 6,
    fontWeight: "700",
  },
  inputWrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginTop: 10,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: 10,
    paddingVertical: 6,
  },
  forgotText: {
    color: COLORS.navy2,
    fontWeight: "800",
    fontSize: 13,
  },
  loginBtn: {
    marginTop: 6,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnDisabled: {
    opacity: 0.55,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  progressBar: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#EAF0F6",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  shimmer: {
    width: 120,
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.green,
    opacity: 0.75,
  },
  dividerRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.muted,
    fontWeight: "800",
    fontSize: 12,
  },
  googleBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  signupRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
  },
  signupHint: {
    color: COLORS.muted,
    fontWeight: "700",
  },
  signupLink: {
    color: COLORS.green,
    fontWeight: "900",
  },
  footer: {
    textAlign: "center",
    color: COLORS.muted,
    fontWeight: "700",
    marginBottom: 16,
  },
});
