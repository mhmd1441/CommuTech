import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config.js";

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
      authToken = data.access_token;
      authUser = data.user;
      await AsyncStorage.setItem("auth_token", data.access_token);
      await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw apiError(error);
    }
  },

  async login(payload) {
    try {
      const { data } = await api.post("/auth/login", payload);
      authToken = data.access_token;
      authUser = data.user;
      await AsyncStorage.setItem("auth_token", data.access_token);
      await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));

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
      await AsyncStorage.multiRemove(["auth_token", "auth_user"]);

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
}

export async function initAuth() {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    const userJson = await AsyncStorage.getItem("auth_user");
    if (token && userJson) {
      authToken = token;
      authUser = JSON.parse(userJson);
      return authUser;
    }
  } catch {
    // storage unreadable — stay logged out
  }
  return null;
}

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
