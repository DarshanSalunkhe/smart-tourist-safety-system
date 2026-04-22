// API-based authentication service with JWT + session support
import { i18n } from './i18n.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

// ── JWT token storage ──────────────────────────────────────────────────────
const TOKEN_KEY = 'st_access_token';
const REFRESH_KEY = 'st_refresh_token';

export function getAccessToken() { return localStorage.getItem(TOKEN_KEY); }

function saveTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Fetch wrapper that attaches Bearer token and auto-refreshes on 401 */
export async function authFetch(url, options = {}) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
          saveTokens(accessToken, newRefresh);
          headers['Authorization'] = `Bearer ${accessToken}`;
          res = await fetch(url, { ...options, headers, credentials: 'include' });
        }
      } catch { /* fall through */ }
    }
  }
  return res;
}

// ── AuthAPIService ─────────────────────────────────────────────────────────

class AuthAPIService {
  constructor() {
    this.currentUser = null;
    this.isLoading = false;
    this.loadUserFromSession();
  }

  async loadUserFromSession() {
    try {
      const response = await authFetch(`${API_URL}/auth/user`);
      if (response.ok) {
        const data = await response.json();
        if (data.pendingGoogleUser) {
          console.log('[Auth] Pending Google user, redirecting to role selection');
          window.location.hash = '#/select-role';
          return;
        }
        if (data.user) {
          this.currentUser = data.user;
          localStorage.setItem('user', JSON.stringify(data.user));
          // Set user ID for language preferences
          i18n.setUserId(data.user.id);
        }
      }
    } catch {
      console.log('[Auth] No active session');
    }
  }

  async loginWithGoogle() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      console.log('[OAuth] Starting Google login flow...');
      const response = await fetch(`${API_URL}/auth/google`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to get OAuth URL: ${response.statusText}`);
      const data = await response.json();

      const width = 500, height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      const popup = window.open(
        data.authUrl, 'Google Login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );
      if (!popup) throw new Error('Popup was blocked. Please allow popups for this site.');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isLoading = false;
          reject(new Error('Login timeout - please try again'));
        }, 120000);

        const checkPopup = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            clearTimeout(timeout);
            this.isLoading = false;
            reject(new Error('Login cancelled'));
          }
        }, 500);

        const messageHandler = async (event) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            clearInterval(checkPopup);
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            try { popup.close(); } catch {}

            try {
              const authResponse = await fetch(`${API_URL}/auth/google/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code: event.data.code })
              });
              if (authResponse.ok) {
                const userData = await authResponse.json();
                this.currentUser = userData.user;
                localStorage.setItem('user', JSON.stringify(userData.user));
                // Set user ID for language preferences
                i18n.setUserId(userData.user.id);
                if (userData.accessToken) saveTokens(userData.accessToken, userData.refreshToken);
                this.isLoading = false;
                resolve(userData.user);
              } else {
                const err = await authResponse.json();
                this.isLoading = false;
                reject(new Error(err.error || 'Authentication failed'));
              }
            } catch (e) {
              this.isLoading = false;
              reject(new Error('Network error - please check your connection'));
            }
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            clearInterval(checkPopup);
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            try { popup.close(); } catch {}
            this.isLoading = false;
            reject(new Error(event.data.error || 'Google authentication failed'));
          }
        };

        window.addEventListener('message', messageHandler);
      });
    } catch (error) {
      this.isLoading = false;
      throw error;
    }
  }

  async login(email, password) {
    try {
      console.log('[Auth] Login attempt');
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      const data = await response.json();
      this.currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      // Set user ID for language preferences
      i18n.setUserId(data.user.id);
      if (data.accessToken) saveTokens(data.accessToken, data.refreshToken);
      console.log('[Auth] Login successful');
      return data.user;
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  }

  async completeGoogleRegistration(role, phone, emergencyContact) {
    try {
      console.log('[Auth] Completing Google registration, role:', role);
      const response = await authFetch(`${API_URL}/auth/google/complete`, {
        method: 'POST',
        body: JSON.stringify({ role, phone, emergencyContact })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      const data = await response.json();
      this.currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      // Set user ID for language preferences
      i18n.setUserId(data.user.id);
      if (data.accessToken) saveTokens(data.accessToken, data.refreshToken);
      console.log('[Auth] Google registration complete');
      return data.user;
    } catch (error) {
      console.error('[Auth] Google registration error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      console.log('[Auth] Registration attempt');
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      const data = await response.json();
      this.currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      // Set user ID for language preferences
      i18n.setUserId(data.user.id);
      if (data.accessToken) saveTokens(data.accessToken, data.refreshToken);
      console.log('[Auth] Registration successful');
      return data.user;
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      console.log('[Auth] Logout attempt');
      await authFetch(`${API_URL}/auth/logout`, { method: 'POST' });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      this.currentUser = null;
      this.isLoading = false;
      localStorage.removeItem('user');
      clearTokens();
      sessionStorage.clear();
      // Clear user ID for language preferences
      i18n.clearUserId();
      console.log('[Auth] Logout complete, redirecting...');
      window.location.hash = '#/';
      setTimeout(() => window.location.reload(), 100);
    }
  }

  getCurrentUser() {
    if (!this.currentUser) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
          // Set user ID for language preferences on page reload
          if (this.currentUser && this.currentUser.id) {
            i18n.setUserId(this.currentUser.id);
          }
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.getCurrentUser();
  }
}

export const authAPIService = new AuthAPIService();
