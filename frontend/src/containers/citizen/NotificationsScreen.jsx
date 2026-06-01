import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getAuthUser } from '../../services/api';
import { getPusher } from '../../services/echo';

const C = {
  navy: '#19405F',
  green: '#4AA85C',
  orange: '#EC9F4B',
  bg: '#F7FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  red: '#EF4444',
};

const NOTIF_META = {
  status_update: { icon: 'sync-circle',             color: C.navy,   bg: '#EFF6FF' },
  resolved:      { icon: 'checkmark-circle',         color: C.green,  bg: '#ECFDF5' },
  assigned:      { icon: 'person-circle',            color: C.orange, bg: '#FEF3E2' },
  rejected:      { icon: 'close-circle',             color: C.red,    bg: '#FEF2F2' },
  system:        { icon: 'information-circle',       color: C.muted,  bg: '#F1F5F9' },
  new_report:    { icon: 'document-text',            color: C.navy,   bg: '#EFF6FF' },
};

function formatDate(dateStr) {
  if (!dateStr) return 'Earlier';
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
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

const NotifItem = ({ item, onPress }) => {
  const meta = NOTIF_META[item.type] || NOTIF_META.system;
  const isUnread = !item.read_at;
  return (
    <TouchableOpacity
      style={[styles.notifItem, isUnread && styles.notifItemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {isUnread && <View style={styles.unreadDot} />}
      <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitle, isUnread && { color: C.navy }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        {item.issue_id && (
          <View style={styles.viewIssuePill}>
            <Ionicons name="arrow-forward-circle-outline" size={12} color={C.navy} />
            <Text style={styles.viewIssueText}>View Issue</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen({ navigation, route }) {
  const role = route?.params?.role || 'citizen';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const channelRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications', { params: { role, page: 1 } });
      setNotifications(data.notifications?.data || []);
      setUnreadCount(data.unread_count || 0);
      setCurrentPage(1);
      setHasMore(!!data.notifications?.next_page_url);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const { data } = await api.get('/notifications', { params: { role, page: nextPage } });
      setNotifications((prev) => [...prev, ...(data.notifications?.data || [])]);
      setCurrentPage(nextPage);
      setHasMore(!!data.notifications?.next_page_url);
    } catch (e) {
      console.error('Failed to load more', e);
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
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
    channel.bind('notification.sent', handler);
    channelRef.current = channel;

    return () => {
      channel.unbind('notification.sent', handler);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  };

  const handleNotifPress = async (notif) => {
    if (!notif.read_at) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {}
    }
    if (notif.issue_id) {
      navigation.navigate('IssueDetails', { issue: { id: notif.issue_id } });
    }
  };

  const grouped = groupNotifications(notifications);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.navy} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={36} color={C.border} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyHint}>You have no notifications right now.</Text>
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
                    <NotifItem item={notif} onPress={handleNotifPress} />
                    {idx < group.items.length - 1 && <View style={styles.itemDivider} />}
                  </View>
                ))}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{ paddingBottom: 100 }}>
              {hasMore && (
                <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={styles.loadMoreBtn}>
                  {loadingMore
                    ? <ActivityIndicator size="small" color={C.navy} />
                    : <Text style={styles.loadMoreText}>Load more</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.red,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.navy + '10' },
  markAllText: { fontSize: 11, color: C.navy, fontWeight: '700' },
  list: { padding: 16, gap: 16 },
  group: { gap: 8 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateLine: { flex: 1, height: 1, backgroundColor: C.border },
  groupCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  notifItem: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start', position: 'relative' },
  notifItemUnread: { backgroundColor: C.navy + '05' },
  unreadDot: { position: 'absolute', top: 18, left: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: C.navy },
  notifIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, gap: 4 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  notifTime: { fontSize: 11, color: C.muted, marginLeft: 8 },
  notifBody: { fontSize: 12, color: C.muted, lineHeight: 17 },
  viewIssuePill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, alignSelf: 'flex-start' },
  viewIssueText: { fontSize: 11, color: C.navy, fontWeight: '700' },
  itemDivider: { height: 1, backgroundColor: C.border, marginLeft: 68 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 28, backgroundColor: C.border + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptyHint: { fontSize: 13, color: C.muted },
  loadMoreBtn: {
    marginTop: 16, marginHorizontal: 16, height: 46, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
  },
  loadMoreText: { color: C.navy, fontWeight: '800', fontSize: 13 },
});
