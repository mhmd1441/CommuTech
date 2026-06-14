import AsyncStorage from "@react-native-async-storage/async-storage";

const PREF_KEYS = {
  notifications: "profile_push_notifications",
  autoLocation: "profile_auto_detect_location",
};

let preferences = {
  notifications: false,
  autoLocation: false,
};

export async function loadAppPreferences() {
  try {
    const entries = await AsyncStorage.multiGet([
      PREF_KEYS.notifications,
      PREF_KEYS.autoLocation,
    ]);

    preferences = {
      notifications: entries[0]?.[1] === "1",
      autoLocation: entries[1]?.[1] === "1",
    };
  } catch {
    preferences = { notifications: false, autoLocation: false };
  }

  return preferences;
}

export function getAppPreferences() {
  return preferences;
}

export function notificationsEnabled() {
  return preferences.notifications;
}

export async function setAppPreference(key, value) {
  preferences = { ...preferences, [key]: value };
  await AsyncStorage.setItem(PREF_KEYS[key], value ? "1" : "0");
  return preferences;
}
