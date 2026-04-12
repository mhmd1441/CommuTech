import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  StatusBar,
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

// ─── Mock User ────────────────────────────────────────────────────────────────
const USER = {
  name: 'Karim Nassar',
  email: 'karim.nassar@gmail.com',
  phone: '+961 70 123 456',
  district: 'Hamra, Beirut',
  avatar: 'https://i.pravatar.cc/150?img=52',
  joinDate: 'March 2025',
  role: 'Citizen',
  stats: {
    submitted: 7,
    resolved: 3,
    inProgress: 2,
    points: 140,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatBox = ({ label, value, color }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color: color || C.navy }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const MenuGroup = ({ title, children }) => (
  <View style={styles.menuGroup}>
    {title && <Text style={styles.menuGroupTitle}>{title}</Text>}
    <View style={styles.menuCard}>{children}</View>
  </View>
);

const MenuItem = ({ icon, iconColor = C.navy, label, value, onPress, rightIcon, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, { backgroundColor: (iconColor || C.navy) + '15' }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={[styles.menuLabel, danger && { color: C.red }]}>{label}</Text>
    <View style={styles.menuRight}>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {rightIcon !== false && (
        <Ionicons
          name={rightIcon || 'chevron-forward'}
          size={16}
          color={danger ? C.red : C.muted}
        />
      )}
    </View>
  </TouchableOpacity>
);

const MenuDivider = () => <View style={styles.menuDivider} />;

const MenuToggle = ({ icon, iconColor = C.navy, label, value, onToggle }) => (
  <View style={styles.menuItem}>
    <View style={[styles.menuIcon, { backgroundColor: (iconColor || C.navy) + '15' }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: C.border, true: C.navy + '60' }}
      thumbColor={value ? C.navy : '#f4f3f4'}
      style={{ marginLeft: 'auto' }}
    />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
function ProfileScreen({ navigation }) {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="create-outline" size={18} color={C.navy} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── User Card ── */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: USER.avatar }} style={styles.avatar} />
            <View style={styles.avatarBadge}>
              <Ionicons name="person" size={10} color="#fff" />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{USER.name}</Text>
            <Text style={styles.userEmail}>{USER.email}</Text>
            <View style={styles.userMeta}>
              <View style={styles.rolePill}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>{USER.role}</Text>
              </View>
              <View style={styles.districtPill}>
                <Ionicons name="location-outline" size={10} color={C.muted} />
                <Text style={styles.districtText}>{USER.district}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          <StatBox label="Submitted" value={USER.stats.submitted} />
          <View style={styles.statsDiv} />
          <StatBox label="Resolved" value={USER.stats.resolved} color={C.green} />
          <View style={styles.statsDiv} />
          <StatBox label="In Progress" value={USER.stats.inProgress} color={C.orange} />
          <View style={styles.statsDiv} />
          <StatBox label="Points" value={USER.stats.points} color={C.navy} />
        </View>

        {/* ── Account ── */}
        <MenuGroup title="Account">
          <MenuItem
            icon="person-circle-outline"
            label="Personal Info"
            value="Update"
            onPress={() => {}}
          />
          <MenuDivider />
          <MenuItem
            icon="location-outline"
            label="Default District"
            value={USER.district}
            onPress={() => {}}
          />
          <MenuDivider />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => {}}
          />
        </MenuGroup>

        {/* ── Preferences ── */}
        <MenuGroup title="Preferences">
          <MenuToggle
            icon="notifications-outline"
            label="Push Notifications"
            value={notifEnabled}
            onToggle={setNotifEnabled}
          />
          <MenuDivider />
          <MenuToggle
            icon="navigate-outline"
            label="Auto-detect Location"
            value={locationEnabled}
            onToggle={setLocationEnabled}
          />
          <MenuDivider />
          <MenuItem
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() => {}}
          />
        </MenuGroup>

        {/* ── Activity ── */}
        <MenuGroup title="Activity">
          <MenuItem
            icon="document-text-outline"
            label="My Reports"
            onPress={() => navigation.navigate('MyReports')}
          />
          <MenuDivider />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
        </MenuGroup>

        {/* ── App Info ── */}
        <MenuGroup title="About">
          <MenuItem
            icon="information-circle-outline"
            iconColor={C.muted}
            label="App Version"
            value="1.0.0 (beta)"
            onPress={() => {}}
            rightIcon={false}
          />
          <MenuDivider />
          <MenuItem
            icon="shield-checkmark-outline"
            iconColor={C.muted}
            label="Privacy Policy"
            onPress={() => {}}
          />
          <MenuDivider />
          <MenuItem
            icon="document-outline"
            iconColor={C.muted}
            label="Terms of Service"
            onPress={() => {}}
          />
        </MenuGroup>

        {/* ── Logout ── */}
        <MenuGroup>
          <MenuItem
            icon="log-out-outline"
            iconColor={C.red}
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </MenuGroup>

        {/* Member since */}
        <Text style={styles.memberSince}>Member since {USER.joinDate}</Text>
        <BottomNav navigation={navigation} activeRoute="CitizenHome" />
        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.navy, letterSpacing: -0.5 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  editText: { fontSize: 13, color: C.navy, fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 20, borderWidth: 3, borderColor: C.navy + '30' },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 17, fontWeight: '800', color: C.text },
  userEmail: { fontSize: 12, color: C.muted },
  userMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.navy + '10',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  roleText: { fontSize: 10, color: C.navy, fontWeight: '700' },
  districtPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  districtText: { fontSize: 10, color: C.muted, fontWeight: '500' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.muted, marginTop: 3, fontWeight: '500' },
  statsDiv: { width: 1, height: 36, backgroundColor: C.border },

  // Menu
  menuGroup: { marginBottom: 12 },
  menuGroupTitle: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 52,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: C.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 12, color: C.muted },
  menuDivider: { height: 1, backgroundColor: C.border, marginLeft: 60 },

  memberSince: { textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 8 },
});
export default ProfileScreen;