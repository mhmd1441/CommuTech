import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { getAuthUser, issueApi } from "../../services/api";
import { fundingPercent, issueStatusKey, issueStatusLabel, money } from "../../services/issuePresentation";

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


function statusColor(status) {
  if (status === "Done" || status === "Resolved" || status === "resolved" || status === "funded") return C.green;
  if (["In Progress", "in_progress", "in-progress", "under_review", "awaiting_funding", "expired"].includes(status)) return C.orange;
  if (status === "Under Investigation" || status === "under_investigation") return C.orange;
  if (status === "Rejected" || status === "rejected") return C.red;
  return C.navy;
}

function priorityColor(priority) {
  if (priority === "Critical") return C.red;
  if (priority === "High" || priority === "Medium") return C.orange;
  return C.navy;
}

export default function IssueDetailsScreen({ navigation, route }) {
  const routeIssue = route?.params?.issue || {};
  const [issue, setIssue] = useState(routeIssue);
  const [loadingIssue, setLoadingIssue] = useState(!routeIssue.title && !!routeIssue.id);
  const [auditNote, setAuditNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", location: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [upvotesCount, setUpvotesCount] = useState(routeIssue.upvotes_count ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(!!(routeIssue.has_upvoted));
  const [upvoting, setUpvoting] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [donating, setDonating] = useState(false);

  const currentUser = getAuthUser();
  const isMyIssue = issue.user_id === currentUser?.id;
  const canEdit = isMyIssue && issue.id && issue.status === "pending" && issue.funding_status !== "funded";

  const openEdit = () => {
    setEditForm({
      title: issue.title || "",
      description: issue.description || "",
      location: issue.location || "",
      category: issue.category || "",
    });
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (editForm.title.trim().length < 4) { Alert.alert("Validation", "Use a clearer title, like Broken streetlight."); return; }
    if (editForm.description.trim().length < 10) { Alert.alert("Validation", "Add a little more detail in the description."); return; }
    if (!editForm.location.trim()) { Alert.alert("Validation", "Location is required."); return; }
    try {
      setSaving(true);
      const { data } = await api.patch(`/issues/${issue.id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        location: editForm.location.trim(),
        category: editForm.category,
      });
      setIssue(data);
      setEditModal(false);
    } catch (e) {
      Alert.alert("Update Failed", e.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Report",
      "Are you sure you want to withdraw this report? This cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Yes, withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await api.delete(`/issues/${issue.id}`);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Failed", e.message || "Could not withdraw report.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!routeIssue.title && routeIssue.id) {
      api.get(`/issues/${routeIssue.id}`)
        .then(({ data }) => {
          setIssue(data);
          setUpvotesCount(data.upvotes_count ?? 0);
          setHasUpvoted(!!(data.has_upvoted));
        })
        .catch(() => {})
        .finally(() => setLoadingIssue(false));
    }
  }, []);

  const handleUpvote = async () => {
    if (upvoting) return;
    try {
      setUpvoting(true);
      const result = await issueApi.upvote(issue.id);
      setHasUpvoted(result.has_upvoted);
      setUpvotesCount(result.upvotes_count);
    } catch {
      // silent — count stays as-is
    } finally {
      setUpvoting(false);
    }
  };
  const statusKey = issueStatusKey(issue);
  const status = issueStatusLabel(issue);
  const priority = issue.priority
    ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)
    : "Medium";
  const showFunding =
    issue.funding_status && issue.funding_status !== "none" && issue.funding_status !== null;
  const canDonate = issue.status === "awaiting_funding" && issue.funding_status === "open";
  const progress = fundingPercent(issue);
  const userDonationTotal = Number(issue.user_donation_total || 0);
  const canConfirmResolution =
    isMyIssue &&
    issue.id &&
    issue.status === "resolved" &&
    (issue.citizen_resolution_confirmed === null || issue.citizen_resolution_confirmed === undefined);

  const confirmResolution = async (resolved) => {
    try {
      setConfirming(true);
      const { data } = await api.patch(`/issues/${issue.id}/confirm-resolution`, {
        resolved,
        note: auditNote.trim() || null,
      });
      setIssue(data.issue || issue);
      setAuditNote("");
      if (resolved) {
        Alert.alert("Resolution Confirmed", "Thank you. This report remains resolved.", [
          { text: "OK", onPress: () => navigation.navigate("MyReports") },
        ]);
      } else {
        Alert.alert("Review Requested", "Thanks. This report will be reviewed again.");
      }
    } catch (error) {
      Alert.alert("Confirmation Failed", error.response?.data?.message || error.message || "Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDonate = async () => {
    const amount = Number(donationAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Donation Amount", "Enter a valid simulated donation amount.");
      return;
    }

    try {
      setDonating(true);
      const data = await issueApi.donate(issue.id, amount);
      setIssue(data.issue || issue);
      setDonationAmount("");
      Alert.alert("Donation Recorded", data.message || "Your simulated donation was recorded.");
    } catch (error) {
      Alert.alert("Donation Failed", error.message || "Please try again.");
    } finally {
      setDonating(false);
    }
  };

  if (loadingIssue) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]} edges={["top"]}>
        <ActivityIndicator size="large" color={C.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={C.navy} />
          </Pressable>
          <Text style={styles.headerTitle}>Issue Details</Text>
          <Pressable onPress={() => navigation.navigate("Notifications", { role: "citizen" })} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={C.navy} />
          </Pressable>
        </View>

        <Image source={{ uri: issue.image_url }} style={styles.heroImage} />

        <View style={styles.card}>
          <View style={styles.metaRow}>
            <View style={[styles.pill, { backgroundColor: statusColor(statusKey) + "18" }]}>
              <Text style={[styles.pillText, { color: statusColor(statusKey) }]}>{status}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: priorityColor(priority) + "18" }]}>
              <Text style={[styles.pillText, { color: priorityColor(priority) }]}>
                {priority}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.description}>{issue.description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={18} color={C.navy} />
              <View>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{issue.category || "General"}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={C.navy} />
              <View>
                <Text style={styles.infoLabel}>Reported</Text>
                <Text style={styles.infoValue}>
                {issue.created_at ? new Date(issue.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : issue.date || "Today"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.locationBox}>
            <Ionicons name="location-outline" size={20} color={C.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{issue.location || "Location unavailable"}</Text>
            </View>
          </View>

          {issue.due_at && !["resolved", "rejected"].includes(issue.status) && (
            <View style={[styles.locationBox, { marginTop: 10, borderColor: issue.sla_breached ? "#FECACA" : C.border, backgroundColor: issue.sla_breached ? "#FEF2F2" : "#fff" }]}>
              <Ionicons name="time-outline" size={20} color={issue.sla_breached ? C.red : C.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Resolution Deadline</Text>
                <Text style={[styles.infoValue, { color: issue.sla_breached ? C.red : C.text }]}>
                  {issue.sla_breached ? "⚠ Overdue — " : ""}{new Date(issue.due_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {!isMyIssue ? (
          <View style={styles.card}>
            <View style={styles.impactHeader}>
              <View style={[styles.impactIconWrap, { backgroundColor: hasUpvoted ? "#ECFDF5" : "#FFF7ED" }]}>
                <Ionicons
                  name={hasUpvoted ? "checkmark-circle" : "megaphone-outline"}
                  size={20}
                  color={hasUpvoted ? C.green : C.orange}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.impactTitle}>
                  {hasUpvoted ? "You reported impact" : "Facing this issue too?"}
                </Text>
                <Text style={styles.impactSubtitle}>
                  {hasUpvoted
                    ? "Thank you. Tap the button to undo."
                    : "Issues affecting more people get resolved faster."}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleUpvote}
              disabled={upvoting}
              style={[styles.impactBtn, hasUpvoted && styles.impactBtnVoted, upvoting && { opacity: 0.6 }]}
            >
              {upvoting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={hasUpvoted ? "checkmark-circle-outline" : "hand-left-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.impactBtnText}>
                    {hasUpvoted ? "I'm Affected — Undo" : "I Have This Problem Too"}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={styles.impactCount}>
              {upvotesCount === 0
                ? "Be the first to report community impact"
                : `${upvotesCount} ${upvotesCount === 1 ? "person" : "people"} reported being affected`}
            </Text>
          </View>
        ) : upvotesCount > 0 ? (
          <View style={[styles.card, styles.impactReadOnly]}>
            <Ionicons name="people" size={18} color={C.navy} />
            <Text style={styles.impactReadOnlyText}>
              {upvotesCount} {upvotesCount === 1 ? "other person" : "other people"} also reported being affected by this issue
            </Text>
          </View>
        ) : null}

        {showFunding && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Community Funding</Text>
            <View style={styles.fundingHeader}>
              <View>
                <Text style={styles.fundingAmount}>{money(issue.funding_raised)} raised</Text>
                <Text style={styles.fundingGoal}>Goal: {money(issue.funding_goal)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: statusColor(statusKey) + "18" }]}>
                <Text style={[styles.pillText, { color: statusColor(statusKey) }]}>{status}</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.fundingNote}>
              {progress}% funded
              {issue.funding_deadline
                ? ` • Deadline ${new Date(issue.funding_deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                : ""}
            </Text>

            {userDonationTotal > 0 && (
              <Text style={styles.fundingNote}>You contributed {money(userDonationTotal)} to this issue.</Text>
            )}

            {canDonate && (
              <View style={styles.donationBox}>
                <Text style={styles.fieldLabel}>Simulated donation amount</Text>
                <TextInput
                  value={donationAmount}
                  onChangeText={setDonationAmount}
                  keyboardType="decimal-pad"
                  placeholder="Example: 10"
                  placeholderTextColor="#94A3B8"
                  style={styles.fieldInput}
                />
                <Pressable
                  onPress={handleDonate}
                  disabled={donating}
                  style={[styles.primaryBtn, { marginTop: 12 }, donating && styles.disabledBtn]}
                >
                  {donating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Donate</Text>}
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Report Progress</Text>
          {[
            ["Report received", "Your report has been saved with its photo and location.", true],
            ["Field review", "Available field workers can review and claim this report.", statusKey !== "pending"],
            ["Resolution update", "When the issue is marked resolved, you can confirm the result.", statusKey === "resolved"],
          ].map(([title, body, done], index) => (
            <View key={title} style={styles.timelineRow}>
              <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                <Text style={styles.timelineNumber}>{index + 1}</Text>
              </View>
              <View style={styles.timelineText}>
                <Text style={styles.timelineTitle}>{title}</Text>
                <Text style={styles.timelineBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        {(issue.worker_resolution_note || issue.worker_resolution_image_url) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Worker Fix Description</Text>
            {issue.worker_resolution_note && (
              <Text style={styles.description}>{issue.worker_resolution_note}</Text>
            )}
            {issue.worker_resolution_image_url && (
              <Image
                source={{ uri: issue.worker_resolution_image_url }}
                style={styles.resolutionImage}
                resizeMode="cover"
              />
            )}
          </View>
        )}

        {issue.status === "rejected" && (
          <View style={styles.rejectedCard}>
            <Ionicons name="close-circle-outline" size={20} color={C.red} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectedTitle}>Report Rejected</Text>
              <Text style={styles.rejectedText}>
                {issue.rejection_reason || "This report was reviewed and could not be processed."}
              </Text>
            </View>
          </View>
        )}

        {issue.status === "under_investigation" && (
          <View style={styles.auditCard}>
            <Ionicons name="shield-outline" size={20} color={C.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.auditTitle}>Under Investigation</Text>
              <Text style={styles.auditText}>
                Your response was sent for review because the resolution was not confirmed.
              </Text>
            </View>
          </View>
        )}

        {canConfirmResolution && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Confirm Resolution</Text>
            <Text style={styles.auditText}>Is this issue actually resolved?</Text>
            <TextInput
              value={auditNote}
              onChangeText={setAuditNote}
              placeholder="Optional note for the admin or worker"
              placeholderTextColor="#94A3B8"
              style={styles.auditInput}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.auditActions}>
              <Pressable
                onPress={() => confirmResolution(false)}
                disabled={confirming}
                style={[styles.auditNoBtn, confirming && styles.disabledBtn]}
              >
                <Text style={styles.auditNoText}>No, Request Review</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmResolution(true)}
                disabled={confirming}
                style={[styles.auditYesBtn, confirming && styles.disabledBtn]}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.auditYesText}>Yes, Resolved</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {canEdit && (
          <View style={styles.actions}>
            <Pressable style={styles.editBtn} onPress={openEdit}>
              <Ionicons name="create-outline" size={18} color={C.navy} />
              <Text style={styles.editBtnText}>Edit Report</Text>
            </Pressable>
            <Pressable
              style={[styles.cancelBtn, deleting && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color={C.red} size="small" />
                : <>
                    <Ionicons name="trash-outline" size={18} color={C.red} />
                    <Text style={styles.cancelBtnText}>Withdraw</Text>
                  </>
              }
            </Pressable>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("MyReports")}>
            <Text style={styles.secondaryText}>My Reports</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CreateIssue")}>
            <Text style={styles.primaryText}>New Report</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Report</Text>
              <Pressable onPress={() => setEditModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.navy} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                value={editForm.title}
                onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
                style={styles.fieldInput}
                placeholder="Broken streetlight"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={editForm.description}
                onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                style={[styles.fieldInput, { height: 100, textAlignVertical: "top" }]}
                placeholder="Briefly describe what you saw"
                placeholderTextColor="#94A3B8"
                multiline
              />

              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                value={editForm.location}
                onChangeText={(v) => setEditForm((f) => ({ ...f, location: v }))}
                style={styles.fieldInput}
                placeholder="Street, area, city"
                placeholderTextColor="#94A3B8"
              />

              <Pressable
                onPress={handleSaveEdit}
                disabled={saving}
                style={[styles.primaryBtn, { marginTop: 16 }, saving && { opacity: 0.6 }]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryText}>Save Changes</Text>
                }
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
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
  headerTitle: { fontSize: 18, color: C.navy, fontWeight: "900" },
  heroImage: { width: "100%", height: 220, borderRadius: 20, backgroundColor: C.border },
  card: {
    marginTop: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
  },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "900" },
  title: { fontSize: 22, fontWeight: "900", color: C.text, lineHeight: 28 },
  description: { marginTop: 10, color: C.muted, fontWeight: "600", lineHeight: 21 },
  infoGrid: { flexDirection: "row", gap: 10, marginTop: 16 },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
  },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: "800" },
  infoValue: { marginTop: 2, color: C.text, fontWeight: "900" },
  locationBox: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "900", marginBottom: 12 },
  fundingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  fundingAmount: { color: C.text, fontSize: 20, fontWeight: "900" },
  fundingGoal: { color: C.muted, fontWeight: "700", marginTop: 3 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: C.navy,
  },
  fundingNote: {
    marginTop: 8,
    color: C.muted,
    fontWeight: "700",
    lineHeight: 18,
  },
  donationBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 9 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: { backgroundColor: C.navy },
  timelineNumber: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  timelineText: { flex: 1 },
  timelineTitle: { color: C.text, fontWeight: "900" },
  timelineBody: { marginTop: 3, color: C.muted, fontWeight: "600", lineHeight: 18 },
  resolutionImage: {
    width: "100%", height: 200, borderRadius: 14,
    marginTop: 12, backgroundColor: C.border,
  },
  rejectedCard: {
    marginTop: 14, flexDirection: "row", gap: 12,
    backgroundColor: "#FEF2F2", borderColor: "#FECACA",
    borderWidth: 1, borderRadius: 18, padding: 16,
  },
  rejectedTitle: { color: C.red, fontWeight: "900", marginBottom: 4 },
  rejectedText: { color: C.muted, fontWeight: "700", lineHeight: 19 },
  auditCard: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  auditTitle: { color: C.text, fontWeight: "900" },
  auditText: { color: C.muted, fontWeight: "700", lineHeight: 19 },
  auditInput: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
    padding: 12,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  auditActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  auditNoBtn: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  auditNoText: { color: C.red, fontWeight: "900" },
  auditYesBtn: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  auditYesText: { color: "#fff", fontWeight: "900" },
  disabledBtn: { opacity: 0.55 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: C.navy, fontWeight: "900" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  editBtn: {
    flex: 1, height: 52, borderRadius: 16, borderWidth: 1,
    borderColor: C.navy, backgroundColor: C.card,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  editBtnText: { color: C.navy, fontWeight: "900" },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: 16, borderWidth: 1,
    borderColor: C.red, backgroundColor: "#FEF2F2",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  cancelBtnText: { color: C.red, fontWeight: "900" },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  modalClose: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center",
  },
  fieldLabel: { color: C.muted, fontWeight: "800", fontSize: 13, marginBottom: 6, marginTop: 12 },
  fieldInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    height: 50, paddingHorizontal: 14, backgroundColor: "#fff",
    color: C.text, fontSize: 15,
  },
  impactHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 16 },
  impactIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  impactTitle: { color: C.text, fontWeight: "900", fontSize: 15 },
  impactSubtitle: { color: C.muted, fontWeight: "600", fontSize: 13, marginTop: 3, lineHeight: 18 },
  impactBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    backgroundColor: C.orange, borderRadius: 16, height: 52, marginBottom: 12,
  },
  impactBtnVoted: { backgroundColor: C.navy },
  impactBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  impactCount: { textAlign: "center", color: C.muted, fontWeight: "700", fontSize: 13 },
  impactReadOnly: { flexDirection: "row", alignItems: "center", gap: 10 },
  impactReadOnlyText: { flex: 1, color: C.muted, fontWeight: "700", fontSize: 13, lineHeight: 19 },
});
