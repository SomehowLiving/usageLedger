import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const DEMO_KEY = "ulk_demo_secret_key_xyz";

export function getApiKey() {
  return localStorage.getItem("ul_api_key") || DEMO_KEY;
}

export function setApiKey(k) {
  localStorage.setItem("ul_api_key", k || DEMO_KEY);
}

export const http = axios.create({ baseURL: API });
http.interceptors.request.use((cfg) => {
  cfg.headers["X-API-Key"] = getApiKey();
  return cfg;
});

export const inr = (v) =>
  "₹" +
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (v) =>
  Number(v || 0).toLocaleString("en-IN");

export function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

