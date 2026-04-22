/**
 * Central API client for SafeTrip.
 * All backend calls go through here — one place to change base URL,
 * auth headers, or error handling for production.
 */

import { apiGet, apiPost, apiRequest } from '../utils/apiHelper.js';

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

const url = (path) => `${BASE}${path}`;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data)        => apiPost(url('/auth/login'), data),
  register:       (data)        => apiPost(url('/auth/register'), data),
  logout:         ()            => apiPost(url('/auth/logout'), {}),
  getUser:        ()            => apiGet(url('/auth/user')),
  completeOAuth:  (data)        => apiPost(url('/auth/google/complete'), data),
};

// ─── Incidents ────────────────────────────────────────────────────────────────
export const incidentsAPI = {
  create:  (data)               => apiPost(url('/api/incidents'), data),
  list:    (params = {})        => apiGet(url('/api/incidents') + _qs(params)),
  update:  (id, data)           => apiRequest(url(`/api/incidents/${id}`), { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  list:    (params = {})        => apiGet(url('/api/users') + _qs(params)),
  remove:  (id)                 => apiRequest(url(`/api/users/${id}`), { method: 'DELETE' }),
  update:  (id, data)           => apiRequest(url(`/api/users/${id}`), { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Risk zones ───────────────────────────────────────────────────────────────
export const riskZonesAPI = {
  list:    (params = {})        => apiGet(url('/api/risk-zones') + _qs(params)),
  create:  (data)               => apiPost(url('/api/risk-zones'), data),
  remove:  (id)                 => apiRequest(url(`/api/risk-zones/${id}`), { method: 'DELETE' }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  overview:   (params = {})     => apiGet(url('/api/analytics/overview')   + _qs(params)),
  severity:   ()                => apiGet(url('/api/analytics/severity')),
  monthly:    (months = 6)      => apiGet(url('/api/analytics/monthly')    + _qs({ months })),
  topCities:  (limit = 5)       => apiGet(url('/api/analytics/top-cities') + _qs({ limit })),
  stateWise:  ()                => apiGet(url('/api/analytics/state-wise')),
};

// ─── Chatbot ──────────────────────────────────────────────────────────────────
export const chatbotAPI = {
  ask: (userId, message, riskData, lang = 'en') =>
    apiPost(url('/api/chatbot'), { userId, message, riskData, lang }),
};

// ─── Voice logs ───────────────────────────────────────────────────────────────
export const voiceLogsAPI = {
  save: (incidentId, audioUrl) => apiPost(url('/api/voice-log'), { incidentId, audioUrl }),
};

// ─── Internal helper ──────────────────────────────────────────────────────────
function _qs(params) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
  ).toString();
  return q ? `?${q}` : '';
}
