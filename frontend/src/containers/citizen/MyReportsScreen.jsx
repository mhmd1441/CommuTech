import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from "../shared/BottomNav";

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

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_META = {
  open: { label: 'Open', color: C.orange, bg: '#FEF3E2', icon: 'radio-button-on-outline' },
  'in-progress': { label: 'In Progress', color: C.navy, bg: '#EFF6FF', icon: 'sync-outline' },
  resolved: { label: 'Resolved', color: C.green, bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', color: C.red, bg: '#FEF2F2', icon: 'close-circle-outline' },
};

const PRIORITY_META = {
  high: { label: 'High', color: C.red },
  medium: { label: 'Medium', color: C.orange },
  low: { label: 'Low', color: C.green },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MY_ISSUES = [
  {
    id: '1',
    title: 'Large pothole on Hamra Street',
    description: 'Deep pothole near the intersection causing damage to vehicles and risk to motorcyclists.',
    category: 'Roads',
    status: 'in-progress',
    priority: 'high',
    location: 'Hamra, Beirut',
    date: 'Apr 10, 2025',
    image: 'https://picsum.photos/seed/road1/200/120',
    workerName: 'Ahmad K.',
    updatedAt: '2h ago',
  },
  {
    id: '2',
    title: 'Street light out for 2 weeks',
    description: 'The lamp post on Bliss Street near AUB gate has been non-functional.',
    category: 'Lighting',
    status: 'open',
    priority: 'medium',
    location: 'Bliss St, Beirut',
    date: 'Apr 9, 2025',
    image: 'https://picsum.photos/seed/light2/200/120',
    updatedAt: '5h ago',
  },
  {
    id: '3',
    title: 'Sewage overflow on main road',
    description: 'Raw sewage spilling onto the road - strong odor and health hazard.',
    category: 'Sanitation',
    status: 'resolved',
    priority: 'high',
    location: 'Achrafieh, Beirut',
    date: 'Apr 7, 2025',
    image: 'https://picsum.photos/seed/sewer4/200/120',
    workerName: 'Rami T.',
    updatedAt: '1d ago',
  },
  {
    id: '4',
    title: 'Illegal waste dumping near school',
    description: 'Residents dumping waste near the school gates. Smell is unbearable.',
    category: 'Environment',
    status: 'rejected',
    priority: 'low',
    location: 'Dekwaneh, Beirut',
    date: 'Apr 5, 2025',
    image: 'https://picsum.photos/seed/waste5/200/120',
    updatedAt: '3d ago',
    rejectReason: 'Outside service area',
  },
];

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'rejected', label: 'Rejected' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first', icon: 'time-outline' },
  { id: 'priority', label: 'Highest priority', icon: 'flame-outline' },
  { id: 'status', label: 'Group by status', icon: 'layers-outline' },
];

// ─── Issue Card ───────────────────────────────────────────────────────────────
const IssueCard = ({ item, onPress }) => {
  const statusMeta = STATUS_META[item.status] || STATUS_META.open;
  const priorityMeta = PRIORITY_META[item.priority] || PRIORITY_META.low;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: statusMeta.color }]} />

      <Image source={{ uri: item.image }} style={styles.cardImage} />

      <View style={styles.cardBody}>
        {/* Top row: title + status */}
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={10} color={statusMeta.color} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        {/* Category */}
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={11} color={C.muted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
            <Text style={[styles.metaText, { color: priorityMeta.color }]}>{priorityMeta.label}</Text>
          </View>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>

        {/* Worker tag (if assigned) */}
        {item.workerName && item.status === 'in-progress' && (
          <View style={styles.workerTag}>
            <Ionicons name="person-outline" size={10} color={C.navy} />
            <Text style={styles.workerText}>Assigned to {item.workerName}</Text>
          </View>
        )}

        {/* Reject reason */}
        {item.status === 'rejected' && item.rejectReason && (
          <View style={styles.rejectTag}>
            <Ionicons name="information-circle-outline" size={10} color={C.red} />
            <Text style={styles.rejectText}>Reason: {item.rejectReason}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const StatsBar = ({ issues }) => {
  const counts = {
    open: issues.filter((i) => i.status === 'open').length,
    'in-progress': issues.filter((i) => i.status === 'in-progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  };
  return (
    <View style={styles.statsBar}>
      {[
        { label: 'Open', count: counts.open, color: C.orange },
        { label: 'In Progress', count: counts['in-progress'], color: C.navy },
        { label: 'Resolved', count: counts.resolved, color: C.green },
      ].map((s) => (
        <View key={s.label} style={styles.statItem}>
          <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyReportsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const statusWeight = { open: 1, 'in-progress': 2, resolved: 3, rejected: 4 };
    const base =
      activeTab === 'all' ? MY_ISSUES : MY_ISSUES.filter((i) => i.status === activeTab);

    return [...base].sort((a, b) => {
      if (sortMode === 'priority') {
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      if (sortMode === 'status') {
        return (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      }
      return Number(b.id) - Number(a.id);
    });
  }, [activeTab, sortMode]);

  const sortLabel = SORT_OPTIONS.find((option) => option.id === sortMode)?.label || 'Newest first';

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: re-fetch from API
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const goToDetail = (issue) => navigation.navigate('IssueDetails', { issue });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Reports</Text>
          <Text style={styles.headerSub}>{MY_ISSUES.length} issues submitted</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setSortModalVisible(true)}>
          <Ionicons name="funnel-outline" size={18} color={C.navy} />
        </TouchableOpacity>
      </View>
      <Text style={styles.sortHint}>Sorted by {sortLabel}</Text>

      {/* Stats */}
      <StatsBar issues={MY_ISSUES} />

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => {
            const active = activeTab === item.id;
            return (
              <TouchableOpacity
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(item.id)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IssueCard item={item} onPress={goToDetail} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.navy]}
            tintColor={C.navy}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={36} color={C.border} />
            </View>
            <Text style={styles.emptyTitle}>No reports here</Text>
            <Text style={styles.emptyHint}>Issues with this status will appear here.</Text>
          </View>
        }
      />
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.sortSheet}>
            <Text style={styles.sheetTitle}>Sort reports</Text>
            {SORT_OPTIONS.map((option) => {
              const active = option.id === sortMode;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.sortOption, active && styles.sortOptionActive]}
                  onPress={() => {
                    setSortMode(option.id);
                    setSortModalVisible(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={active ? C.navy : C.muted}
                  />
                  <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>
                    {option.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={C.green} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
      <BottomNav navigation={navigation} activeTab="MyReports" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.navy, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  sortHint: {
    marginHorizontal: 20,
    marginTop: -8,
    marginBottom: 10,
    color: C.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statCount: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '500' },

  // Tabs
  tabsWrapper: { marginBottom: 10 },
  tabs: { paddingHorizontal: 20, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: C.navy, borderColor: C.navy },
  tabText: { fontSize: 12, fontWeight: '500', color: C.muted },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardImage: { width: 86, height: 'auto', minHeight: 110 },
  cardBody: { flex: 1, padding: 10, gap: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: { fontSize: 9, fontWeight: '700' },
  cardDesc: { fontSize: 11, color: C.muted, lineHeight: 15 },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.navy + '10',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 1,
  },
  categoryText: { fontSize: 10, color: C.navy, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10, color: C.muted, maxWidth: 80 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  dateText: { fontSize: 10, color: C.muted, marginLeft: 'auto' },

  workerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.navy + '10',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  workerText: { fontSize: 10, color: C.navy, fontWeight: '600' },

  rejectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  rejectText: { fontSize: 10, color: C.red, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: C.border + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  emptyHint: { fontSize: 12, color: C.muted, textAlign: 'center', paddingHorizontal: 40 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sortSheet: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
    marginBottom: 92,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
  sortOption: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortOptionActive: { backgroundColor: C.navy + '10' },
  sortOptionText: { flex: 1, color: C.muted, fontWeight: '700' },
  sortOptionTextActive: { color: C.navy, fontWeight: '900' },
});
