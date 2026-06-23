import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import api, { getAuthUser } from "../../services/api";
import { getPusher } from "../../services/echo";

const C = {
  navy: "#19405F",
  green: "#4AA85C",
  orange: "#EC9F4B",
  bg: "#F7FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  red: "#EF4444",
  blue: "#3B82F6",
};

const NOTIF_META = {
  status_update: { icon: "sync-circle", color: C.navy, bg: "#EFF6FF" },
  resolved: { icon: "checkmark-circle", color: C.green, bg: "#ECFDF5" },
  assigned: { icon: "person-circle", color: C.orange, bg: "#FEF3E2" },
  rejected: { icon: "close-circle", color: C.red, bg: "#FEF2F2" },
  system: { icon: "information-circle", color: C.muted, bg: "#F1F5F9" },
  new_report: { icon: "document-text", color: C.navy, bg: "#EFF6FF" },
};

function formatDate(dateStr) {
  if (!dateStr) return "Earlier";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function groupNotifications(notifs) {
  const groups = {};
  notifs.forEach((n) => {
    const label = formatDate(n.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

const NotifItem = ({
  item,
  onPress,
  onLongPress,
  isSelected,
  isSelectMode,
  onMarkRead,
  onMarkUnread,
  onDelete,
}) => {
  const meta = NOTIF_META[item.type] || NOTIF_META.system;
  const isUnread = !item.read_at;
  const swipeableRef = useRef(null);

  const closeSwipeable = () => swipeableRef.current?.close();

  const renderRightActions = (progress, dragX) => {
    const actions = isUnread
      ? [
          {
            label: "Mark read",
            icon: "mail-open-outline",
            color: C.green,
            bg: "#16a34a",
            onPress: () => {
              closeSwipeable();
              onMarkRead(item);
            },
          },
        ]
      : [
          {
            label: "Mark unread",
            icon: "mail-unread-outline",
            color: "#fff",
            bg: C.blue,
            onPress: () => {
              closeSwipeable();
              onMarkUnread(item);
            },
          },
          {
            label: "Delete",
            icon: "trash-outline",
            color: "#fff",
            bg: C.red,
            onPress: () => {
              closeSwipeable();
              onDelete(item);
            },
          },
        ];

    return (
      <View style={{ flexDirection: "row" }}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.swipeAction, { backgroundColor: a.bg }]}
            onPress={a.onPress}
            activeOpacity={0.85}
          >
            <Ionicons name={a.icon} size={20} color={a.color} />
            <Text style={[styles.swipeActionText, { color: a.color }]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLeftActions = () => {
    if (!isUnread) return null;
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: C.green, minWidth: 80 }]}
        onPress={() => {
          closeSwipeable();
          onMarkRead(item);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="mail-open-outline" size={20} color="#fff" />
        <Text style={[styles.swipeActionText, { color: "#fff" }]}>Read</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      enabled={!isSelectMode}
    >
      <TouchableOpacity
        style={[
          styles.notifItem,
          isUnread && styles.notifItemUnread,
          isSelected && styles.notifItemSelected,
        ]}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        activeOpacity={0.75}
        delayLongPress={350}
      >
        {isSelectMode ? (
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
        ) : (
          isUnread && <View style={styles.unreadDot} />
        )}

        <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifTopRow}>
            <Text
              style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function NotificationsScreen({ navigation, route }) {
  const role = route?.params?.role || "citizen";
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const channelRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications", {
        params: { role, page: 1 },
      });
      setNotifications(data.notifications?.data || []);
      setUnreadCount(data.unread_count || 0);
      setCurrentPage(1);
      setHasMore(!!data.notifications?.next_page_url);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const { data } = await api.get("/notifications", {
        params: { role, page: nextPage },
      });
      setNotifications((prev) => [
        ...prev,
        ...(data.notifications?.data || []),
      ]);
      setCurrentPage(nextPage);
      setHasMore(!!data.notifications?.next_page_url);
    } catch (e) {
      console.error("Failed to load more", e);
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  useEffect(() => {
    const user = getAuthUser();
    if (!user) return;
    const pusher = getPusher();
    if (!pusher) return;
    const handler = (data) => {
      if (data?.recipient_role !== role) return;
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };
    const channel = pusher.subscribe(`private-user.${user.id}`);
    channel.bind("notification.sent", handler);
    channelRef.current = channel;
    return () => {
      channel.unbind("notification.sent", handler);
    };
  }, []);

  // ── actions ──────────────────────────────────────────────
  const markRead = (notif) => {
    if (notif.read_at) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    api.patch(`/notifications/${notif.id}/read`).catch(() => {});
  };

  const markUnread = (notif) => {
    if (!notif.read_at) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read_at: null } : n)),
    );
    setUnreadCount((prev) => prev + 1);
    api.patch(`/notifications/${notif.id}/unread`).catch(() => {});
  };

  const deleteNotif = (notif) => {
    const wasUnread = !notif.read_at;
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    api.delete(`/notifications/${notif.id}`).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  // ── normal tap ────────────────────────────────────────────
  const handlePress = (notif) => {
    if (selectMode) {
      toggleSelect(notif.id);
      return;
    }
    markRead(notif);
    if (notif.issue_id)
      navigation.navigate("IssueDetails", { issue: { id: notif.issue_id } });
  };

  const handleNotifPress = (notif) => {
    if (!notif.issue_id) return;

    if (role === "worker") {
      navigation.reset({
        index: 0,
        routes: [
          { name: "WorkerHome", params: { openIssueId: notif.issue_id } },
        ],
      });
      return;
    }

    navigation.navigate("IssueDetails", { issue: { id: notif.issue_id } });
  };

  const grouped = groupNotifications(notifications);
  const allSelected =
    notifications.length > 0 && selected.size === notifications.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode} style={styles.backBtn}>
              <Ionicons name="close" size={20} color={C.navy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selected.size} selected</Text>
            <TouchableOpacity
              onPress={() => {
                if (allSelected) setSelected(new Set());
                else setSelected(new Set(notifications.map((n) => n.id)));
              }}
              style={styles.markAllBtn}
            >
              <Text style={styles.markAllText}>
                {allSelected ? "Deselect all" : "Select all"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={C.navy} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="notifications-off-outline"
              size={36}
              color={C.border}
            />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyHint}>
            You have no notifications right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateLabel}>{group.date}</Text>
                <View style={styles.dateLine} />
              </View>
              <View style={styles.groupCard}>
                {group.items.map((notif, idx) => (
                  <View key={notif.id}>
                    <NotifItem
                      item={notif}
                      onPress={handlePress}
                      onLongPress={handleLongPress}
                      isSelected={selected.has(notif.id)}
                      isSelectMode={selectMode}
                      onMarkRead={markRead}
                      onMarkUnread={markUnread}
                      onDelete={deleteNotif}
                    />
                    {idx < group.items.length - 1 && (
                      <View style={styles.itemDivider} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{ paddingBottom: selectMode ? 120 : 100 }}>
              {hasMore && (
                <TouchableOpacity
                  onPress={loadMore}
                  disabled={loadingMore}
                  style={styles.loadMoreBtn}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={C.navy} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <View style={styles.bulkBar}>
          <TouchableOpacity style={styles.bulkBtn} onPress={bulkMarkRead}>
            <Ionicons name="mail-open-outline" size={18} color={C.navy} />
            <Text style={styles.bulkBtnText}>Mark read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkBtn} onPress={bulkMarkUnread}>
            <Ionicons name="mail-unread-outline" size={18} color={C.navy} />
            <Text style={styles.bulkBtnText}>Mark unread</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkBtn, styles.bulkBtnDelete]}
            onPress={bulkDelete}
          >
            <Ionicons name="trash-outline" size={18} color={C.red} />
            <Text style={[styles.bulkBtnText, { color: C.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.navy },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.navy + "10",
  },
  markAllText: { fontSize: 11, color: C.navy, fontWeight: "700" },
  list: { padding: 16, gap: 16 },
  group: { gap: 8 },
  dateHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: C.border },
  groupCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notifItem: {
    flexDirection: "row",
    padding: 15,
    gap: 12,
    alignItems: "flex-start",
    position: "relative",
    backgroundColor: C.card,
  },
  notifItemUnread: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
  },
  notifItemSelected: {
    backgroundColor: C.navy + "0D",
  },
  unreadDot: {
    position: "absolute",
    top: 20,
    left: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.blue,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "center",
  },
  checkboxSelected: { backgroundColor: C.navy, borderColor: C.navy },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1, gap: 4 },
  notifTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTitle: { fontSize: 13, fontWeight: "600", color: C.text, flex: 1 },
  notifTitleUnread: { fontWeight: "800", color: C.navy },
  notifTime: { fontSize: 11, color: C.muted, marginLeft: 8 },
  notifBody: { fontSize: 12, color: C.muted, lineHeight: 17 },
  swipeAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 4,
    minWidth: 72,
  },
  swipeActionText: { fontSize: 11, fontWeight: "700" },
  itemDivider: { height: 1, backgroundColor: C.border, marginLeft: 68 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: C.border + "50",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  emptyHint: { fontSize: 13, color: C.muted },
  loadMoreBtn: {
    marginTop: 16,
    marginHorizontal: 16,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { color: C.navy, fontWeight: "800", fontSize: 13 },
  bulkBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: 28,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  bulkBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  bulkBtnDelete: { borderLeftWidth: 1, borderLeftColor: C.border },
  bulkBtnText: { fontSize: 12, fontWeight: "700", color: C.navy },
});
