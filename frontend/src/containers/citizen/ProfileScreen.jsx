import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  Animated,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BottomNav from "../shared/BottomNav";
import JumpingDots from "../shared/LoadingPage/JumpingDots";
import api, { getAuthUser, setAuthUser as setStoredAuthUser, profileApi, authApi } from "../../services/api";
import { disconnectPusher } from "../../services/echo";
import { loadAppPreferences, setAppPreference } from "../../services/preferences";

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
const EMPTY_STATS = {
  submitted: 0,
  resolved: 0,
  inProgress: 0,
};

const roleLabel = (role) => role.charAt(0).toUpperCase() + role.slice(1);

const PROFILE_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true, autoCapitalize: 'words' },
  { key: 'father_name', label: 'Father Name', autoCapitalize: 'words' },
  { key: 'last_name', label: 'Last Name', required: true, autoCapitalize: 'words' },
  { key: 'email', label: 'Email', required: true, keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'phone', label: 'Phone', required: true, keyboardType: 'phone-pad' },
  { key: 'country', label: 'Country', required: true, autoCapitalize: 'words' },
  { key: 'city', label: 'City / Governorate', required: true, autoCapitalize: 'words' },
  { key: 'area', label: 'Area', autoCapitalize: 'words' },
  { key: 'street', label: 'Street', autoCapitalize: 'words' },
  { key: 'building', label: 'Building', autoCapitalize: 'words' },
];

const REQUIRED_PROFILE_FIELDS = PROFILE_FIELDS.filter((field) => field.required);
const DEFAULT_PROFILE = {
  first_name: '',
  father_name: '',
  last_name: '',
  email: '',
  phone: '',
  profile_picture_url: '',
  country: '',
  city: '',
  area: '',
  street: '',
  building: '',
  name: '',
  created_at: '',
  is_verified: false,
};

function cleanText(value) {
  return value ? String(value) : '';
}

function normalizeProfile(user = {}) {
  const nameParts = cleanText(user.name).trim().split(/\s+/).filter(Boolean);

  return {
    first_name: cleanText(user.first_name) || nameParts[0] || '',
    father_name: cleanText(user.father_name),
    last_name: cleanText(user.last_name) || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''),
    email: cleanText(user.email),
    phone: cleanText(user.phone),
    profile_picture_url: cleanText(user.profile_picture_url),
    country: cleanText(user.country),
    city: cleanText(user.city),
    area: cleanText(user.area),
    street: cleanText(user.street),
    building: cleanText(user.building),
    name: cleanText(user.name) || DEFAULT_PROFILE.name,
    created_at: cleanText(user.created_at),
    is_verified: Boolean(user.is_verified),
  };
}

function displayName(profile) {
  const parts = [profile.first_name, profile.father_name, profile.last_name]
    .map((part) => cleanText(part).trim())
    .filter(Boolean);

  return parts.join(' ') || profile.name || 'Profile loading...';
}

function formatDistrict(profile) {
  return [profile.area, profile.city].filter(Boolean).join(', ') || profile.city || 'No district yet';
}

function hasVerifiedProfileSnapshot(profile) {
  return Boolean(profile.email && profile.profile_picture_url && profile.is_verified);
}

function formatJoinDate(date) {
  if (!date) return '';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function imageFormFile(asset, fallbackName) {
  const type = asset.mimeType || 'image/jpeg';
  const extension = type.split('/')[1] || 'jpg';

  return {
    uri: asset.uri,
    name: asset.fileName || `${fallbackName}.${extension}`,
    type,
  };
}

function requestErrorMessage(error) {
  return (
    error.response?.data?.message ||
    Object.values(error.response?.data?.errors || {})?.[0]?.[0] ||
    'Request failed. Please try again.'
  );
}

function getRoleNames(user) {
  const roleNames = Array.isArray(user?.role_names) ? user.role_names : [];
  const relationRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => (typeof role === 'string' ? role : role.name))
    : [];

  return [...roleNames, ...relationRoles, user?.role]
    .filter(Boolean)
    .map((role) => String(role).toLowerCase())
    .filter((role, index, roles) => roles.indexOf(role) === index);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatBox = ({ label, value, color, loading }) => (
  <View style={styles.statBox}>
    {loading ? (
      <View style={styles.statLoading}>
        <JumpingDots color={color || C.navy} />
      </View>
    ) : (
      <Text style={[styles.statValue, { color: color || C.navy }]}>{value}</Text>
    )}
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
      trackColor={{ false: '#CBD5E1', true: C.navy + '75' }}
      thumbColor={value ? C.navy : '#FFFFFF'}
      ios_backgroundColor="#CBD5E1"
      style={{ marginLeft: 'auto' }}
    />
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
function ProfileScreen({ navigation }) {
  const initialProfile = normalizeProfile(getAuthUser() || {});
  const initialProfileNeedsRefresh = !hasVerifiedProfileSnapshot(initialProfile);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [authUser, setAuthUserState] = useState(getAuthUser());
  const [stats, setStats] = useState(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [personalInfo, setPersonalInfo] = useState(initialProfile);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [profileLoading, setProfileLoading] = useState(initialProfileNeedsRefresh);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [district, setDistrict] = useState(formatDistrict(initialProfile));
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  // ── Toast ────────────────────────────────────────────────────────────────────
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const [toastMsg, setToastMsg] = useState({ text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg({ text, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }, 2500);
  };

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const saved = await loadAppPreferences();

        if (!isMounted) return;

        setNotifEnabled(saved.notifications);
        setLocationEnabled(saved.autoLocation);
      } catch {
        // Keep app preferences off if storage is unavailable.
      }
    };

    const loadProfile = async () => {
      try {
        const { data } = await api.get('/me');
        if (!isMounted) return;

        const user = data.user;
        setAuthUserState(user);
        setStoredAuthUser(user);
        setStats({
          submitted: data.stats?.submitted ?? EMPTY_STATS.submitted,
          resolved: data.stats?.resolved ?? EMPTY_STATS.resolved,
          inProgress: data.stats?.in_progress ?? EMPTY_STATS.inProgress,
        });
        setStatsLoading(false);
        const profile = normalizeProfile(user);
        setPersonalInfo(profile);
        setProfileForm(profile);
        setDistrict(formatDistrict(profile));
      } catch (error) {
        console.error('Failed to load profile:', error);
        setStatsLoading(false);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadPreferences();
    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const roleNames = useMemo(() => getRoleNames(authUser), [authUser]);
  const canSwitchToWorker = roleNames.includes('citizen') && roleNames.includes('worker');
  const displayRole = roleNames.length > 0 ? roleNames.map(roleLabel).join(' / ') : 'Citizen';
  const currentDisplayName = displayName(personalInfo);
  const avatarUrl = personalInfo.profile_picture_url;
  const verificationLabel = profileLoading ? 'Checking profile' : personalInfo.is_verified ? 'Verified' : 'Complete profile';
  const verificationColor = profileLoading ? C.muted : personalInfo.is_verified ? C.green : C.orange;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          disconnectPusher();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          authApi.logout().catch(() => {});
        },
      },
    ]);
  };

  const handleSwitchToWorkerMode = () => {
    navigation.reset({ index: 0, routes: [{ name: 'WorkerHome' }] });
  };

  const handleToggleNotifications = async (value) => {
    setNotifEnabled(value);
    await setAppPreference('notifications', value);
    if (!value) disconnectPusher();
  };

  const handleToggleLocation = async (value) => {
    setLocationEnabled(value);
    await setAppPreference('autoLocation', value);
  };

  const handleOpenAppSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('Settings', 'Open CommuTech from your phone settings to manage permissions.');
    });
  };

  const handleOpenPersonalInfo = () => {
    setProfileForm(personalInfo);
    setActiveModal('personal');
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickProfilePicture = async () => {
    if (uploadingAvatar) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Access Needed',
          'Enable photo library access from Settings to update your profile picture.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: handleOpenAppSettings },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const formData = new FormData();
      formData.append('profile_picture', imageFormFile(result.assets[0], 'profile-picture'));

      setUploadingAvatar(true);
      const { data } = await api.post('/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const profile = normalizeProfile(data.user);

      setAuthUserState(data.user);
      setStoredAuthUser(data.user);
      setPersonalInfo(profile);
      setProfileForm(profile);
      setDistrict(formatDistrict(profile));

      showToast(profile.is_verified ? 'Profile picture updated — profile verified!' : 'Profile picture updated.');
    } catch (error) {
      Alert.alert('Upload failed', requestErrorMessage(error));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      Alert.alert('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      Alert.alert('Passwords do not match', 'New password and confirmation must match.');
      return;
    }
    try {
      setSavingPassword(true);
      await profileApi.changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      setActiveModal(null);
      showToast('Password updated successfully.');
    } catch (error) {
      Alert.alert('Password not updated', error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    const payload = PROFILE_FIELDS.reduce((values, field) => {
      values[field.key] = cleanText(profileForm[field.key]).trim();
      return values;
    }, {});

    const missingRequired = REQUIRED_PROFILE_FIELDS.filter((field) => !payload[field.key]);
    if (missingRequired.length > 0) {
      Alert.alert(
        'Missing required info',
        `Please fill: ${missingRequired.map((field) => field.label).join(', ')}.`
      );
      return;
    }

    try {
      setSavingProfile(true);
      const { data } = await api.put('/me', payload);
      const profile = normalizeProfile(data.user);

      setAuthUserState(data.user);
      setStoredAuthUser(data.user);
      setPersonalInfo(profile);
      setProfileForm(profile);
      setDistrict(formatDistrict(profile));
      setActiveModal(null);

      showToast(profile.is_verified ? 'Profile saved — now verified!' : 'Profile saved.');
    } catch (error) {
      Alert.alert('Profile not saved', requestErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── User Card ── */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            activeOpacity={0.8}
            onPress={handlePickProfilePicture}
            disabled={uploadingAvatar}
          >
            {profileLoading && !avatarUrl ? (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <JumpingDots color={C.navy} size={6} />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={26} color={C.navy} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={10} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentDisplayName}</Text>
            <Text style={styles.userEmail}>{personalInfo.email}</Text>
            <View style={styles.userMeta}>
              <View style={styles.rolePill}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>{displayRole}</Text>
              </View>
              <View style={[styles.verificationPill, { borderColor: verificationColor + '35' }]}>
                <Ionicons
                  name={profileLoading ? 'time-outline' : personalInfo.is_verified ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={10}
                  color={verificationColor}
                />
                <Text style={[styles.verificationText, { color: verificationColor }]}>
                  {verificationLabel}
                </Text>
              </View>
              <View style={styles.districtPill}>
                <Ionicons name="location-outline" size={10} color={C.muted} />
                <Text style={styles.districtText}>{district}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          <StatBox label="Submitted" value={stats.submitted} loading={statsLoading} />
          <View style={styles.statsDiv} />
          <StatBox label="Resolved" value={stats.resolved} color={C.green} loading={statsLoading} />
          <View style={styles.statsDiv} />
          <StatBox label="In Progress" value={stats.inProgress} color={C.orange} loading={statsLoading} />
        </View>

        {/* ── Account ── */}
        <MenuGroup title="Account">
          <MenuItem
            icon="person-circle-outline"
            label="Personal Info"
            value={verificationLabel}
            onPress={handleOpenPersonalInfo}
          />
          <MenuItem
            icon="location-outline"
            label="Default Municipality"
            value={district}
            onPress={() => setActiveModal('district')}
          />
          <MenuDivider />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => setActiveModal('password')}
          />
        </MenuGroup>

        {/* ── Preferences ── */}
        <MenuGroup title="Preferences">
          <MenuToggle
            icon="notifications-outline"
            label="Push Notifications"
            value={notifEnabled}
            onToggle={handleToggleNotifications}
          />
          <MenuDivider />
          <MenuToggle
            icon="navigate-outline"
            label="Auto-detect Location"
            value={locationEnabled}
            onToggle={handleToggleLocation}
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
            onPress={() => navigation.navigate('ReportHistory')}
          />
          <MenuDivider />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
        </MenuGroup>

        {/* ── Payments ── */}
        <MenuGroup title="Payments">
          <MenuItem
            icon="card-outline"
            iconColor={C.navy}
            label="Saved Payment Methods"
            onPress={() => navigation.navigate('SavedPaymentMethods')}
          />
          <MenuDivider />
          <MenuItem
            icon="heart-outline"
            iconColor={C.green}
            label="My Contributions"
            onPress={() => navigation.navigate('MyContributions')}
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
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <MenuDivider />
          <MenuItem
            icon="document-outline"
            iconColor={C.muted}
            label="Terms of Service"
            onPress={() => navigation.navigate('Terms')}
          />
        </MenuGroup>

        {/* ── Logout ── */}
        <MenuGroup>
          {canSwitchToWorker && (
            <>
              <MenuItem
                icon="briefcase-outline"
                iconColor={C.orange}
                label="Switch to Worker Mode"
                value="Available"
                onPress={handleSwitchToWorkerMode}
              />
              <MenuDivider />
            </>
          )}
          <MenuItem
            icon="log-out-outline"
            iconColor={C.red}
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </MenuGroup>

        {!!formatJoinDate(personalInfo.created_at) && (
          <Text style={styles.memberSince}>Member since {formatJoinDate(personalInfo.created_at)}</Text>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      <Modal
        visible={!!activeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'personal'
                  ? 'Personal Info'
                  : activeModal === 'district'
                  ? 'Default District'
                  : 'Change Password'}
              </Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => { setActiveModal(null); setPasswordForm({ current: '', next: '', confirm: '' }); }}>
                <Ionicons name="close" size={20} color={C.navy} />
              </TouchableOpacity>
            </View>

            {activeModal === 'personal' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalHint}>
                  Required fields must stay filled. Change your profile picture by tapping the photo beside your name.
                </Text>
                <ScrollView
                  style={styles.profileFieldsScroll}
                  contentContainerStyle={styles.profileFieldsContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {PROFILE_FIELDS.map((field) => (
                    <View key={field.key} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {field.label}
                        {field.required && <Text style={styles.requiredMark}> *</Text>}
                      </Text>
                      <TextInput
                        value={profileForm[field.key]}
                        onChangeText={(value) => handleProfileFieldChange(field.key, value)}
                        keyboardType={field.keyboardType || 'default'}
                        autoCapitalize={field.autoCapitalize || 'sentences'}
                        style={styles.modalInput}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {activeModal === 'district' && (
              <View style={styles.modalBody}>
                {['Hamra, Beirut', 'Achrafieh, Beirut', 'Jounieh', 'Tripoli', 'Saida'].map(
                  (option) => {
                    const selected = option === district;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.districtOption, selected && styles.districtOptionActive]}
                        onPress={() => {
                          setDistrict(option);
                          setActiveModal(null);
                        }}
                      >
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={selected ? C.navy : C.muted}
                        />
                        <Text
                          style={[
                            styles.districtOptionText,
                            selected && styles.districtOptionTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            )}

            {activeModal === 'password' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalHint}>
                 Enter your current password and choose a new one.
                </Text>
                <Text style={styles.inputLabel}>Current password</Text>
                <TextInput
                  value={passwordForm.current}
                  onChangeText={(current) => setPasswordForm((prev) => ({ ...prev, current }))}
                  secureTextEntry
                  style={styles.modalInput}
                />
                <Text style={styles.inputLabel}>New password</Text>
                <TextInput
                  value={passwordForm.next}
                  onChangeText={(next) => setPasswordForm((prev) => ({ ...prev, next }))}
                  secureTextEntry
                  style={styles.modalInput}
                />
                <Text style={styles.inputLabel}>Confirm new password</Text>
                <TextInput
                  value={passwordForm.confirm}
                  onChangeText={(confirm) => setPasswordForm((prev) => ({ ...prev, confirm }))}
                  secureTextEntry
                  style={styles.modalInput}
                />
              </View>
            )}

            {activeModal !== 'district' && (
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, (savingProfile || savingPassword) && styles.modalPrimaryBtnDisabled]}
                onPress={
                  activeModal === 'personal' ? handleSaveProfile :
                  activeModal === 'password' ? handleChangePassword :
                  () => setActiveModal(null)
                }
                disabled={savingProfile || savingPassword}
              >
                {(savingProfile || savingPassword) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryText}>
                    {activeModal === 'personal' ? 'Save Changes' : 'Done'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <BottomNav navigation={navigation} activeTab="Profile" />

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          toastMsg.type === 'error' ? styles.toastError : styles.toastSuccess,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <Ionicons
          name={toastMsg.type === 'error' ? 'close-circle' : 'checkmark-circle'}
          size={18}
          color={toastMsg.type === 'error' ? '#B91C1C' : C.green}
        />
        <Text style={[styles.toastText, toastMsg.type === 'error' && { color: '#B91C1C' }]}>
          {toastMsg.text}
        </Text>
      </Animated.View>
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
  avatar: { width: 68, height: 68, borderRadius: 22, borderWidth: 3, borderColor: C.navy + '30' },
  avatarPlaceholder: {
    backgroundColor: C.navy + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  verificationText: { fontSize: 10, fontWeight: '800' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 20,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '850' },
  statLoading: { minHeight: 27, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '700' },
  statsDiv: { width: 1, height: 40, backgroundColor: C.border },

  // Menu
  menuGroup: { marginBottom: 12 },
  menuGroupTitle: { fontSize: 12, fontWeight: '800', color: C.navy, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 92,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalBody: { gap: 9, flexShrink: 1 },
  modalHint: { color: C.muted, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  profileFieldsScroll: {
    flexShrink: 1,
    maxHeight: Platform.OS === 'ios' ? 300 : 360,
  },
  profileFieldsContent: { paddingBottom: 8 },
  inputGroup: { marginBottom: 10 },
  inputLabel: { color: C.muted, fontSize: 12, fontWeight: '800', marginTop: 4 },
  requiredMark: { color: C.red },
  modalInput: {
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    color: C.text,
    backgroundColor: '#fff',
  },
  districtOption: {
    minHeight: 48,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  districtOptionActive: { backgroundColor: C.navy + '10', borderColor: C.navy + '35' },
  districtOptionText: { flex: 1, color: C.muted, fontWeight: '700' },
  districtOptionTextActive: { color: C.navy, fontWeight: '900' },
  modalPrimaryBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 15,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnDisabled: { opacity: 0.7 },
  modalPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  toast: {
    position: 'absolute',
    top: 16,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    zIndex: 999,
  },
  toastSuccess: { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' },
  toastError:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  toastText: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text },
});
export default ProfileScreen;
