import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";

const C = {
  navy:   "#19405F",
  green:  "#4AA85C",
  red:    "#EF4444",
  bg:     "#F7FAFC",
  card:   "#FFFFFF",
  text:   "#0F172A",
  muted:  "#64748B",
  border: "#E2E8F0",
};

const BRANDS = {
  visa:       { icon: "card-outline",           color: "#1A1F71" },
  mastercard: { icon: "card-outline",           color: "#EB001B" },
  whish:      { icon: "phone-portrait-outline", color: "#00A86B" },
  omt:        { icon: "cash-outline",           color: "#FF6B00" },
  paypal:     { icon: "logo-paypal",            color: "#003087" },
  card:       { icon: "card-outline",           color: C.navy   },
};

function BrandBadge({ brand }) {
  const b = BRANDS[brand] || BRANDS.card;
  return (
    <View style={[s.badge, { backgroundColor: b.color + "18" }]}>
      <Ionicons name={b.icon} size={20} color={b.color} />
    </View>
  );
}

export default function SavedPaymentMethodsScreen({ navigation }) {
  const [methods, setMethods]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState(null); // id of row being actioned

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      api.get("/payment-methods")
        .then(({ data }) => { if (active) setMethods(data); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleSetDefault = async (item) => {
    if (item.is_default || working) return;
    setWorking(item.id);
    try {
      await api.patch(`/payment-methods/${item.id}/default`);
      setMethods((prev) =>
        prev.map((m) => ({ ...m, is_default: m.id === item.id }))
      );
    } catch {
      Alert.alert("Error", "Could not set default. Please try again.");
    } finally {
      setWorking(null);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Remove Payment Method",
      `Remove ${item.label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setWorking(item.id);
            try {
              await api.delete(`/payment-methods/${item.id}`);
              setMethods((prev) => prev.filter((m) => m.id !== item.id));
            } catch {
              Alert.alert("Error", "Could not remove. Please try again.");
            } finally {
              setWorking(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={s.row}>
      <BrandBadge brand={item.brand} />
      <View style={s.rowInfo}>
        <Text style={s.rowLabel}>{item.label}</Text>
        {item.is_default && (
          <View style={s.defaultBadge}>
            <Text style={s.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>

      {/* Set default */}
      <Pressable
        style={s.iconBtn}
        onPress={() => handleSetDefault(item)}
        disabled={!!working}
      >
        {working === item.id ? (
          <ActivityIndicator size="small" color={C.navy} />
        ) : (
          <Ionicons
            name={item.is_default ? "star" : "star-outline"}
            size={20}
            color={item.is_default ? C.navy : C.muted}
          />
        )}
      </Pressable>

      {/* Delete */}
      <Pressable
        style={s.iconBtn}
        onPress={() => handleDelete(item)}
        disabled={!!working}
      >
        <Ionicons name="trash-outline" size={20} color={C.red} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.navy} />
        </Pressable>
        <Text style={s.headerTitle}>Saved Payment Methods</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={C.navy} style={{ marginTop: 40 }} />
      ) : methods.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="card-outline" size={48} color={C.muted} />
          <Text style={s.emptyTitle}>No saved methods</Text>
          <Text style={s.emptyHint}>
            When you pay for an issue and choose to save your method, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn:     { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },

  list: { padding: 16 },
  row:  {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  sep:     { height: 10 },
  badge:   { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  defaultBadge: {
    backgroundColor: C.navy + "15",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "800", color: C.navy },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  emptyHint:  { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
});
