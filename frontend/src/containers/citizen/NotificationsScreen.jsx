import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
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

// ─── Notification Types ───────────────────────────────────────────────────────
const NOTIF_META = {
  status_update: {
    icon: 'sync-circle',
    color: C.navy,
    bg: '#EFF6FF',
  },
  resolved: {
    icon: 'checkmark-circle',
    color: C.green,
    bg: '#ECFDF5',
  },
  assigned: {
    icon: 'person-circle',
    color: C.orange,
    bg: '#FEF3E2',
  },
  rejected: {
    icon: 'close-circle',
    color: C.red,
    bg: '#FEF2F2',
  },
  system: {
    icon: 'information-circle',
    color: C.muted,
    bg: '#F1F5F9',
  },
  new_report: {
    icon: 'document-text',
    color: C.navy,
    bg: '#EFF6FF',
  },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: '1',
    type: 'resolved',
    title: 'Issue Resolved ✓',
    body: 'Your report "Sewage overflow on main road" has been marked as resolved by the assigned worker.',
    time: '2h ago',
    date: 'Today',
    read: false,
    issueId: '3',
  },
  {
    id: '2',
    type: 'assigned',
    title: 'Worker Assigned',
    body: 'Ahmad K. has been assigned to your report "Large pothole on Hamra Street".',
    time: '5h ago',
    date: 'Today',
    read: false,
    issueId: '1',
  },
  {
    id: '3',
    type: 'status_update',
    title: 'Status Updated',
    body: 'Your report "Street light out for 2 weeks" is now under review and marked In Progress.',
    time: '9h ago',
    date: 'Today',
    read: true,
    issueId: '2',
  },
  {
    id: '4',
    type: 'rejected',
    title: 'Report Rejected',
    body: '"Illegal waste dumping near school" was rejected. Reason: Outside service area.',
    time: '1d ago',
    date: 'Yesterday',
    read: true,
    issueId: '4',
  },
  {
    id: '5',
    type: 'new_report',
    title: 'Report Submitted',
    body: 'Your issue "Illegal construction blocking sidewalk" was submitted successfully and is pending review.',
    time: '2d ago',
    date: 'Yesterday',
    read: true,
    issueId: '5',
  },
  {
    id: '6',
    type: 'system',
    title: 'Welcome to CommuTech',
    body: 'Thank you for joining CommuTech. Help improve your community by reporting infrastructure issues near you.',
    time: '5d ago',
    date: 'Apr 7',
    read: true,
  },
];

// ─── Group by Date ────────────────────────────────────────────────────────────
const groupNotifications = (notifs) => {
  const groups = {};
  notifs.forEach((n) => {
    if (!groups[n.date]) groups[n.date] = [];
    groups[n.date].push(n);
  });
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
};

// ─── Notification Item ────────────────────────────────────────────────────────
const NotifItem = ({ item, onPress, onMarkRead }) => {
  const meta = NOTIF_META[item.type] || NOTIF_META.system;
  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.read && styles.notifItemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {/* Unread indicator */}
      {!item.read && <View style={styles.unreadDot} />}

      {/* Icon */}
      <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitle, !item.read && { color: C.navy }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>
          {item.body}
        </Text>
        {item.issueId && (
          <View style={styles.viewIssuePill}>
            <Ionicons name="arrow-forward-circle-outline" size={12} color={C.navy} />
            <Text style={styles.viewIssueText}>View Issue</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const grouped = groupNotifications(notifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifPress = (notif) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    // Navigate to issue if applicable
    if (notif.issueId) {
      navigation.navigate('IssueDetails', { issue: { id: notif.issueId } });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
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
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {notifications.length === 0 ? (
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
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <Text style={styles.dateLabel}>{group.date}</Text>
                <View style={styles.dateLine} />
              </View>

              {/* Items */}
              <View style={styles.groupCard}>
                {group.items.map((notif, idx) => (
                  <View key={notif.id}>
                    <NotifItem
                      item={notif}
                      onPress={handleNotifPress}
                    />
                    {idx < group.items.length - 1 && <View style={styles.itemDivider} />}
                  </View>
                ))}
              </View>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.navy + '10',
  },
  markAllText: { fontSize: 11, color: C.navy, fontWeight: '700' },

  list: { padding: 16, gap: 16 },

  group: { gap: 8 },

  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateLine: { flex: 1, height: 1, backgroundColor: C.border },

  groupCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  notifItem: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    position: 'relative',
  },
  notifItemUnread: { backgroundColor: C.navy + '05' },

  unreadDot: {
    position: 'absolute',
    top: 18,
    left: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.navy,
  },

  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notifContent: { flex: 1, gap: 4 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1 },
  notifTime: { fontSize: 11, color: C.muted, marginLeft: 8 },
  notifBody: { fontSize: 12, color: C.muted, lineHeight: 17 },

  viewIssuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  viewIssueText: { fontSize: 11, color: C.navy, fontWeight: '700' },

  itemDivider: { height: 1, backgroundColor: C.border, marginLeft: 68 },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: C.border + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptyHint: { fontSize: 13, color: C.muted },
});
