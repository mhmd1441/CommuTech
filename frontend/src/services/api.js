import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config.js";
import { loadAppPreferences } from "./preferences";

export { API_BASE_URL };
let authToken = null;
let authUser = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

function apiError(error) {
  const message =
    error.response?.data?.message ||
    Object.values(error.response?.data?.errors || {})?.[0]?.[0] ||
    "Request failed. Please try again.";

  return new Error(message);
}

export const authApi = {
  async register(payload) {
    try {
      const { data } = await api.post("/auth/register", payload);
      // No token yet — user must verify email first
      return data; // { message, email }
    } catch (error) {
      throw apiError(error);
    }
  },

  async login(payload) {
    try {
      const { remember, ...credentials } = payload;
      const { data } = await api.post("/auth/login", credentials);
      authToken = data.access_token;
      authUser = data.user;
      if (remember) {
        await AsyncStorage.setItem("auth_token", data.access_token);
        await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
        await AsyncStorage.setItem("remember_auth", "1");
      } else {
        await AsyncStorage.multiRemove(["auth_token", "auth_user", "remember_auth"]);
      }

      return data;
    } catch (error) {
      throw apiError(error);
    }
  },

  async sendOtp(email) {
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      return data;
    } catch (error) {
      const err = apiError(error);
      err.retryAfter = error.response?.data?.retry_after ?? 0;
      throw err;
    }
  },

  async verifyOtp(email, otp) {
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      return data;
    } catch (error) {
      throw apiError(error);
    }
  },

  async resetPassword(email, otp, password) {
    try {
      const { data } = await api.post("/auth/reset-password", {
        email,
        otp,
        password,
        password_confirmation: password,
      });
      return data;
    } catch (error) {
      throw apiError(error);
    }
  },

  async logout() {
    try {
      const { data } = await api.post("/auth/logout");
      authToken = null;
      authUser = null;
      await AsyncStorage.multiRemove(["auth_token", "auth_user", "remember_auth"]);

      return data;
    } catch (error) {
      throw apiError(error);
    }
  },
};

export function getAuthToken() {
  return authToken;
}

export function getAuthUser() {
  return authUser;
}

export function setAuthUser(user) {
  authUser = user;

  AsyncStorage.getItem("remember_auth")
    .then((rememberAuth) => {
      if (rememberAuth === "1" && user) {
        return AsyncStorage.setItem("auth_user", JSON.stringify(user));
      }

      if (!user) {
        return AsyncStorage.removeItem("auth_user");
      }

      return null;
    })
    .catch(() => {
      // Keep the in-memory user even if local storage is unavailable.
    });
}

export async function initAuth() {
  try {
    await loadAppPreferences();
    const token = await AsyncStorage.getItem("auth_token");
    const userJson = await AsyncStorage.getItem("auth_user");
    const rememberAuth = await AsyncStorage.getItem("remember_auth");
    if (rememberAuth === "1" && token && userJson) {
      authToken = token;
      authUser = JSON.parse(userJson);
      return authUser;
    }
    await AsyncStorage.multiRemove(["auth_token", "auth_user", "remember_auth"]);
  } catch {
    // storage unreadable — stay logged out
  }
  return null;
}

export const emailVerificationApi = {
  async resend(email) {
    try {
      const { data } = await api.post("/auth/email/resend", { email });
      return data;
    } catch (error) {
      const err = apiError(error);
      err.retryAfter = error.response?.data?.retry_after ?? 0;
      throw err;
    }
  },

  async verify(email, otp) {
    try {
      const { data } = await api.post("/auth/email/verify", { email, otp });
      authToken = data.access_token;
      authUser = data.user;
      await AsyncStorage.multiRemove(["auth_token", "auth_user", "remember_auth"]);
      return data;
    } catch (error) {
      throw apiError(error);
    }
  },
};

export const issueApi = {
  async upvote(id) {
    try {
      const { data } = await api.post(`/issues/${id}/upvote`);
      return data; // { has_upvoted, upvotes_count, affected_count }
    } catch (error) {
      throw apiError(error);
    }
  },

  async donate(id, amount) {
    try {
      const { data } = await api.post(`/issues/${id}/donations`, { amount });
      return data;
    } catch (error) {
      throw apiError(error);
    }
  },

  async contributions() {
    try {
      const { data } = await api.get("/me/contributions");
      return data;
    } catch (error) {
      throw apiError(error);
    }
  },
};

export const profileApi = {
  async changePassword(currentPassword, newPassword) {
    try {
      const { data } = await api.put('/me/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPassword,
      });
      return data;
    } catch (error) {
      throw apiError(error);
    }
  },
};

export default api;
