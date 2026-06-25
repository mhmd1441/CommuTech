import AsyncStorage from "@react-native-async-storage/async-storage";

const PREF_KEYS = {
  notifications: "profile_push_notifications",
  autoLocation:  "profile_auto_detect_location",
};

const MUNICIPALITY_KEY = "default_municipality";

let preferences = {
  notifications:        true,
  autoLocation:         false,
  defaultMunicipality:  null,
};

export async function loadAppPreferences() {
  try {
    const entries = await AsyncStorage.multiGet([
      PREF_KEYS.notifications,
      PREF_KEYS.autoLocation,
    ]);
    const municipality = await AsyncStorage.getItem(MUNICIPALITY_KEY);

    preferences = {
      notifications:       entries[0]?.[1] !== "0",
      autoLocation:        entries[1]?.[1] === "1",
      defaultMunicipality: municipality || null,
    };
  } catch {
    preferences = { notifications: true, autoLocation: false, defaultMunicipality: null };
  }

  return preferences;
}

export function getAppPreferences() {
  return preferences;
}

export function notificationsEnabled() {
  return preferences.notifications;
}

export function getDefaultMunicipality() {
  return preferences.defaultMunicipality || null;
}

export async function setDefaultMunicipality(name) {
  preferences = { ...preferences, defaultMunicipality: name || null };
  if (name) {
    await AsyncStorage.setItem(MUNICIPALITY_KEY, name);
  } else {
    await AsyncStorage.removeItem(MUNICIPALITY_KEY);
  }
}

export async function setAppPreference(key, value) {
  preferences = { ...preferences, [key]: value };
  await AsyncStorage.setItem(PREF_KEYS[key], value ? "1" : "0");
  return preferences;
}
