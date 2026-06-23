import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import api, { getAuthUser } from "../../services/api";
import { getPusher } from "../../services/echo";

const COLORS = {
  navy: "#19405F",
  green: "#4AA85C",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  bubbleWorker: "#19405F",
  bubbleAdmin: "#FFFFFF",
};

export default function ChatScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [taggedIssue, setTaggedIssue] = useState(null);
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueResults, setIssueResults] = useState([]);
  const [searchingIssues, setSearchingIssues] = useState(false);
  const [tagError, setTagError] = useState("");
  const searchTimeout = useRef(null);

  const flatListRef = useRef(null);
  const channelRef = useRef(null);
  const oldestMessageIdRef = useRef(null);

  // load conversation + last 50 messages
  const loadConversation = useCallback(async () => {
    try {
      const me = getAuthUser();
      setUser(me);
      const res = await api.get("/chat/conversation");
      setConversation(res.data.conversation);
      setMessages(res.data.messages);
      if (res.data.messages.length > 0) {
        oldestMessageIdRef.current = res.data.messages[0].id;
      }
      setHasMore(res.data.messages.length === 50);
      // mark as read
      await api.post("/chat/conversation/read").catch(() => {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // load older messages (scroll up)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestMessageIdRef.current) return;
    setLoadingMore(true);
    try {
      const res = await api.get("/chat/conversation/messages", {
        params: { before: oldestMessageIdRef.current },
      });
      if (res.data.messages.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages((prev) => [...res.data.messages, ...prev]);
      oldestMessageIdRef.current = res.data.messages[0].id;
      setHasMore(res.data.messages.length === 50);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  useFocusEffect(
    useCallback(() => {
      loadConversation();
    }, [loadConversation])
  );

  // subscribe to pusher private-user.{id}
  useEffect(() => {
    let mounted = true;
    const me = getAuthUser();
    if (!me) return;
    const pusher = getPusher();
    const channel = pusher.subscribe(`private-user.${me.id}`);
    channelRef.current = channel;
    channel.bind("chat.message", (data) => {
      if (!mounted) return;
      setMessages((prev) => [...prev, data]);
      api.post("/chat/conversation/read").catch(() => {});
    });
    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unbind("chat.message");
      }
    };
  }, []);

  const loadLatestWorkerIssues = useCallback(async () => {
    setSearchingIssues(true);
    try {
      const res = await api.get("/issues", { params: { per_page: 3 } });
      setIssueResults(res.data.data || []);
    } catch {
      setIssueResults([]);
    } finally {
      setSearchingIssues(false);
    }
  }, []);

  const searchIssues = useCallback((q) => {
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { loadLatestWorkerIssues(); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingIssues(true);
      try {
        const res = await api.get("/issues", { params: { search: q, per_page: 8 } });
        setIssueResults(res.data.data || []);
      } catch {
        setIssueResults([]);
      } finally {
        setSearchingIssues(false);
      }
    }, 300);
  }, [loadLatestWorkerIssues]);

  const sendMessage = async () => {
    const body = inputText.trim();
    if (!body || sending) return;
    if (taggedIssue && body.length < 10) {
      setTagError("Please add at least 10 characters when tagging an issue.");
      return;
    }
    setTagError("");
    setSending(true);
    setInputText("");
    const payload = { body };
    if (taggedIssue) { payload.issue_id = taggedIssue.id; }
    try {
      const res = await api.post("/chat/conversation/messages", payload);
      setMessages((prev) => [...prev, res.data.message]);
      setTaggedIssue(null);
    } catch {
      setInputText(body);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_role === "worker";
    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMine ? styles.bubbleRight : styles.bubbleLeft,
        ]}
      >
        {!isMine && (
          <Text style={styles.senderName}>{item.sender_name}</Text>
        )}
        {item.issue_id && (
          <View style={[styles.issueTag, isMine && styles.issueTagMine]}>
            <Ionicons name="document-text-outline" size={12} color={isMine ? "#CBD5E1" : COLORS.navy} />
            <Text style={[styles.issueTagText, isMine && { color: "#CBD5E1" }]}>
              #{item.issue_id} — {item.issue_title}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMine && { color: "#FFFFFF" }]}>
            {item.body}
          </Text>
        </View>
        <Text style={[styles.timeText, isMine && { textAlign: "right" }]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.navy} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Municipality Admin</Text>
          {conversation?.assigned_admin_name ? (
            <Text style={styles.headerSub}>
              Handled by {conversation.assigned_admin_name}
            </Text>
          ) : (
            <Text style={styles.headerSub}>No admin assigned yet</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onEndReachedThreshold={0.1}
          ListHeaderComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={COLORS.muted} style={{ marginVertical: 10 }} />
            ) : hasMore ? (
              <Pressable onPress={loadMore} style={styles.loadMoreBtn}>
                <Text style={styles.loadMoreText}>Load older messages</Text>
              </Pressable>
            ) : null
          }
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Issue picker modal */}
        {showIssuePicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerBox}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Tag an Issue</Text>
                <Pressable onPress={() => { setShowIssuePicker(false); setIssueSearch(""); setIssueResults([]); }}>
                  <Ionicons name="close" size={20} color={COLORS.muted} />
                </Pressable>
              </View>
              <TextInput
                style={styles.pickerInput}
                value={issueSearch}
                onChangeText={(t) => { setIssueSearch(t); searchIssues(t); }}
                placeholder="Search by title or issue #..."
                placeholderTextColor={COLORS.muted}
                autoFocus
              />
              {!searchingIssues && issueResults.length > 0 && issueSearch.length === 0 && (
                <Text style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Your recent issues
                </Text>
              )}
              {searchingIssues && (
                <ActivityIndicator size="small" color={COLORS.navy} style={{ marginVertical: 12 }} />
              )}
              {issueResults.map((issue) => (
                <Pressable
                  key={issue.id}
                  style={styles.issueRow}
                  onPress={() => {
                    setTaggedIssue(issue);
                    setShowIssuePicker(false);
                    setIssueSearch("");
                    setIssueResults([]);
                  }}
                >
                  <Text style={styles.issueRowId}>#{issue.id}</Text>
                  <Text style={styles.issueRowTitle} numberOfLines={1}>{issue.title}</Text>
                </Pressable>
              ))}
              {!searchingIssues && issueResults.length === 0 && (
                <Text style={{ padding: 14, color: COLORS.muted, fontSize: 13 }}>
                  {issueSearch.length > 0 ? "No issues found." : "You have no open issues."}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {!!tagError && (
            <Text style={styles.tagError}>{tagError}</Text>
          )}
          {taggedIssue && (
            <View style={styles.tagPreview}>
              <Ionicons name="pricetag-outline" size={12} color={COLORS.navy} />
              <Text style={styles.tagPreviewText} numberOfLines={1}>
                #{taggedIssue.id} — {taggedIssue.title}
              </Text>
              <Pressable onPress={() => setTaggedIssue(null)} style={{ marginLeft: "auto" }}>
                <Ionicons name="close-circle" size={16} color={COLORS.muted} />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <Pressable
              style={[styles.tagBtn, taggedIssue && styles.tagBtnActive]}
              onPress={() => { setShowIssuePicker(true); setIssueSearch(""); loadLatestWorkerIssues(); }}
            >
              <Ionicons name="pricetag-outline" size={16} color={taggedIssue ? COLORS.navy : COLORS.muted} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={(t) => { setInputText(t); if (tagError) setTagError(""); }}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <Pressable
              style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.4 }]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  messageList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  bubbleWrapper: { marginBottom: 12, maxWidth: "78%" },
  bubbleLeft: { alignSelf: "flex-start" },
  bubbleRight: { alignSelf: "flex-end" },
  senderName: { fontSize: 11, fontWeight: "600", color: COLORS.navy, marginBottom: 3 },
  issueTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF1F7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  issueTagMine: { backgroundColor: "rgba(255,255,255,0.15)" },
  issueTagText: { fontSize: 11, color: COLORS.navy, fontWeight: "600" },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: COLORS.navy,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  timeText: { fontSize: 10, color: COLORS.muted, marginTop: 4 },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  tagPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF1F7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  tagPreviewText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.navy,
  },
  tagBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tagBtnActive: {
    backgroundColor: "#EAF1F7",
    borderColor: "#BFDBFE",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pickerOverlay: {
    position: "absolute",
    bottom: 80,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  pickerBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  pickerInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  issueRowId: { fontSize: 13, fontWeight: "700", color: COLORS.navy, flexShrink: 0 },
  issueRowTitle: { flex: 1, fontSize: 13, color: COLORS.text },
  tagError: {
    fontSize: 12,
    color: "#EF5350",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  loadMoreBtn: { alignItems: "center", paddingVertical: 10 },
  loadMoreText: { fontSize: 12, color: COLORS.muted },
});
