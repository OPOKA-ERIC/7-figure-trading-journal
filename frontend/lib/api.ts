import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const res = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = res.data.access_token;
        localStorage.setItem("access_token", newToken);
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config);
      } catch {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; display_name: string }) =>
    api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  logout: () => api.post("/auth/logout"),

  verifyEmail: (token: string) =>
    api.post("/auth/verify-email", { token }),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post("/auth/reset-password", { token, new_password }),
};

// ─── USER ────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get("/users/me"),
  updateProfile: (data: { display_name?: string; timezone?: string }) =>
    api.patch("/users/me", data),
};

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────
export const accountApi = {
  list: () => api.get("/accounts"),
  create: (data: { account_name: string; broker?: string; currency?: string }) =>
    api.post("/accounts", data),
  update: (id: string, data: { account_name?: string; broker?: string }) =>
    api.patch(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

// ─── TRADES ──────────────────────────────────────────────────────────────────
export const tradeApi = {
  list: (accountId: string, params?: { page?: number; limit?: number; symbol?: string }) =>
    api.get("/trades", { params: { account_id: accountId, ...params } }),
  get: (id: string) => api.get(`/trades/${id}`),
  import: (accountId: string, file: File) => {
    const form = new FormData();
    form.append("account_id", accountId);
    form.append("file", file);
    return api.post("/trades/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (id: string) => api.delete(`/trades/${id}`),
};

// ─── PSYCHOLOGY ───────────────────────────────────────────────────────────────
export const psychologyApi = {
  log: (tradeId: string, data: {
    emotion?: string;
    followed_plan?: string;
    mistake_type?: string;
    notes?: string;
  }) => api.post(`/psychology/${tradeId}`, data),
  get: (tradeId: string) => api.get(`/psychology/${tradeId}`),
};

// ─── BILLING ─────────────────────────────────────────────────────────────────
export const billingApi = {
  createCheckout: () => api.post("/billing/create-checkout"),
  createPortal: () => api.post("/billing/create-portal"),
};

// ─── RULES ───────────────────────────────────────────────────────────────────
export const rulesApi = {
  get: () => api.get("/users/me/rules"),
  save: (data: {
    max_daily_trades: number;
    max_risk_percent: number;
    trading_session: string;
    session_start_utc?: string | null;
    session_end_utc?: string | null;
    custom_mistakes: string[];
  }) => api.put("/users/me/rules", data),
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: (accountId: string) =>
    api.get("/analytics/overview", { params: { account_id: accountId } }),
  equityCurve: (accountId: string) =>
    api.get("/analytics/equity-curve", { params: { account_id: accountId } }),
  bySymbol: (accountId: string) =>
    api.get("/analytics/by-symbol", { params: { account_id: accountId } }),
  byDay: (accountId: string) =>
    api.get("/analytics/by-day", { params: { account_id: accountId } }),
  discipline: (accountId: string) =>
    api.get("/analytics/discipline", { params: { account_id: accountId } }),
  runDetections: (accountId: string) =>
    api.post("/analytics/run-detections", null, { params: { account_id: accountId } }),
  detections: (accountId: string) =>
    api.get("/analytics/detections", { params: { account_id: accountId } }),
  acknowledgeDetection: (id: string) =>
    api.patch(`/analytics/detections/${id}/acknowledge`),
};