import axios from "axios";
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
