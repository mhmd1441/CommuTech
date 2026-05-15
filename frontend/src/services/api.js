import axios from "axios";

//export const API_BASE_URL = "http://127.0.0.1:8000/api";
// Real iPhone or Samsung testing:
// 1. Run Laravel with: php artisan serve --host=0.0.0.0 --port=8000
// 2. Replace 127.0.0.1 with your laptop IPv4 address.
// Example:
// export const API_BASE_URL = "http://192.168.1.45:8000/api";
//Mhmd 
//export const API_BASE_URL = "http://192.168.100.51:8000/api";
//Mhmd Uni
//export const API_BASE_URL = "http://172.16.129.137:8000/api";
//sara Uni 
//export const API_BASE_URL = "http://172.16.187.188:8000/api";

//export const API_BASE_URL = "http://192.168.92.146:8000/api";

//Ngrok
//export const API_BASE_URL = "https://speak-unselect-turret.ngrok-free.dev/api";

//NGROK SARA
export const API_BASE_URL = "https://tuition-remission-hunger.ngrok-free.dev/api"; 

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

export default api;
