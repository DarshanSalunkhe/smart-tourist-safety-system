/**
 * Unified Settings View Component
 * Provides consistent Settings UI across all user roles (Tourist, Authority, Admin)
 * 
 * Features:
 * - Common settings: Theme, Language, Logout
 * - Role-specific settings: Tourist (Location, Notifications, Voice), Authority (Notifications)
 * - Uses existing themeService for user-specific theme persistence
 * - Uses existing i18n service for language management
 * - Consistent SafeTrip Companion visual design
 */

import { i18n, LANGUAGE_OPTIONS } from '../services/i18n.js';
import { themeService } from '../services/theme.js';
import { authAPIService } from '../services/auth-api.js';

/**
 * Generate Settings HTML
 * @param {Object} user - Current user object { id, name, email, role, blockchainId }
 * @param {Object} options - Optional role-specific settings
 * @param {boolean} options.showLocationSharing - Show location sharing toggle (Tourist only)
 * @param {boolean} options.showNotifications - Show notifications toggle
 * @param {boolean} options.showVoiceCommands - Show voice commands toggle (Tourist only)
 * @param {boolean} options.showAccountInfo - Show account info card (Tourist only)
 * @returns {string} HTML string for settings view
 */
export function createSettingsView(user, options = {}) {
  const {
    showLocationSharing = false,
    showNotifications = false,
    showVoiceCommands = false,
    showAccountInfo = false
  } = options;

  const isDark = themeService.isDark();

  return `
    <!-- Main Settings Card -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fa-solid fa-gear"></i> ${i18n.t('settings')}
        </h3>
      </div>
      <div class="card-body">
        
        <!-- Appearance Section -->
        <div class="setting-section">
          <div class="setting-section-title">
            <i class="fa-solid fa-palette"></i> ${i18n.t('appearance') || 'Appearance'}
          </div>
          
          <!-- Dark Mode -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                <i class="fa-solid fa-moon" style="color:var(--primary);margin-right:.4rem;"></i> 
                ${i18n.t('dark_mode')}
              </div>
              <div class="setting-desc">${i18n.t('dark_mode_desc') || 'Toggle dark theme for better visibility at night'}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="darkModeCheck" ${isDark ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- Language Section -->
        <div class="setting-section">
          <div class="setting-section-title">
            <i class="fa-solid fa-language"></i> ${i18n.t('language') || 'Language'}
          </div>
          
          <!-- Language Selector -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                <i class="fa-solid fa-globe" style="color:var(--info);margin-right:.4rem;"></i> 
                ${i18n.t('language')}
              </div>
              <div class="setting-desc">${i18n.t('language_desc') || 'Choose your preferred language'}</div>
            </div>
            <select class="form-control" id="languageSelect" style="width:auto;min-width:150px;">
              ${LANGUAGE_OPTIONS.map(l =>
                `<option value="${l.code}" ${i18n.currentLang === l.code ? 'selected' : ''}>${l.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        ${showLocationSharing || showNotifications || showVoiceCommands ? `
        <!-- Preferences Section -->
        <div class="setting-section">
          <div class="setting-section-title">
            <i class="fa-solid fa-sliders"></i> ${i18n.t('preferences') || 'Preferences'}
          </div>
          
          ${showLocationSharing ? `
          <!-- Location Sharing -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                <i class="fa-solid fa-location-dot" style="color:var(--success);margin-right:.4rem;"></i> 
                ${i18n.t('share_location')}
              </div>
              <div class="setting-desc">${i18n.t('share_location_desc') || 'Allow SafeTrip to track your location for safety monitoring'}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="shareLocationCheck" checked>
              <span class="slider"></span>
            </label>
          </div>
          ` : ''}
          
          ${showNotifications ? `
          <!-- Notifications -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                <i class="fa-solid fa-bell" style="color:var(--warning);margin-right:.4rem;"></i> 
                ${i18n.t('notifications')}
              </div>
              <div class="setting-desc">${i18n.t('notifications_desc') || 'Enable desktop notifications for alerts and updates'}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="notificationsCheck" checked>
              <span class="slider"></span>
            </label>
          </div>
          ` : ''}
          
          ${showVoiceCommands ? `
          <!-- Voice Commands -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                <i class="fa-solid fa-microphone" style="color:var(--danger);margin-right:.4rem;"></i> 
                ${i18n.t('voice_commands')}
              </div>
              <div class="setting-desc">${i18n.t('voice_commands_desc') || 'Enable voice commands for hands-free operation'}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="voiceCommandsCheck">
              <span class="slider"></span>
            </label>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Logout -->
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);">
          <button class="btn btn-danger" id="logoutBtn" style="width:100%;">
            <i class="fa-solid fa-right-from-bracket"></i> ${i18n.t('sign_out') || i18n.t('logout')}
          </button>
        </div>
      </div>
    </div>

    ${showAccountInfo ? `
    <!-- Account Info Card (Tourist Only) -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <i class="fa-solid fa-circle-user"></i> ${i18n.t('account_info') || 'Account Information'}
        </h3>
      </div>
      <div class="card-body">
        <div style="display:grid;gap:.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('name')}</span>
            <span style="font-size:.875rem;font-weight:600;">${user.name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('email')}</span>
            <span style="font-size:.875rem;">${user.email}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border);">
            <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('role')}</span>
            <span class="badge badge-primary">${user.role}</span>
          </div>
          ${user.blockchainId ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;">
            <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('blockchain_id') || 'Blockchain ID'}</span>
            <code style="font-size:.78rem;background:var(--bg-2);padding:.2rem .5rem;border-radius:var(--r-sm);">${user.blockchainId}</code>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    ` : ''}
  `;
}

/**
 * Setup Settings Event Handlers
 * @param {Function} onNotification - Callback to show notifications (message, type)
 * @param {Function} onLogout - Callback to handle logout
 * @param {Object} options - Same options as createSettingsView
 */
export function setupSettingsHandlers(onNotification, onLogout, options = {}) {
  const {
    showLocationSharing = false,
    showNotifications = false,
    showVoiceCommands = false
  } = options;

  // Dark mode toggle
  const darkCheck = document.getElementById('darkModeCheck');
  if (darkCheck) {
    darkCheck.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      themeService.setTheme(theme);
      onNotification(
        `${e.target.checked ? i18n.t('dark_mode') : i18n.t('light_mode') || 'Light mode'} ${i18n.t('enabled') || 'enabled'}`,
        'success'
      );
    });
  }

  // Language selector
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.value = i18n.currentLang;
    langSelect.addEventListener('change', (e) => {
      i18n.setLanguage(e.target.value);
      onNotification(i18n.t('language_changed') || 'Language changed successfully', 'success');
      // Some dashboards auto-reload, some don't - let caller decide
    });
  }

  // Location sharing toggle (Tourist only)
  if (showLocationSharing) {
    const shareCheck = document.getElementById('shareLocationCheck');
    if (shareCheck) {
      shareCheck.addEventListener('change', (e) => {
        const msg = e.target.checked 
          ? i18n.t('location_sharing_enabled') || 'Location sharing enabled'
          : i18n.t('location_sharing_disabled') || 'Location sharing disabled';
        onNotification(msg, e.target.checked ? 'success' : 'info');
      });
    }
  }

  // Notifications toggle
  if (showNotifications) {
    const notifCheck = document.getElementById('notificationsCheck');
    if (notifCheck) {
      notifCheck.addEventListener('change', (e) => {
        const msg = e.target.checked
          ? i18n.t('notif_enabled') || 'Notifications enabled'
          : i18n.t('notif_disabled') || 'Notifications disabled';
        onNotification(msg, e.target.checked ? 'success' : 'info');
      });
    }
  }

  // Voice commands toggle (Tourist only)
  if (showVoiceCommands) {
    const voiceCheck = document.getElementById('voiceCommandsCheck');
    if (voiceCheck) {
      voiceCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
          import('../services/voice.js').then(({ voiceService }) => {
            const started = voiceService.start();
            if (started) {
              onNotification(i18n.t('voice_enabled') || 'Voice commands enabled', 'success');
            } else {
              e.target.checked = false;
              onNotification(i18n.t('voice_unsupported') || 'Voice commands not supported', 'error');
            }
          });
        } else {
          import('../services/voice.js').then(({ voiceService }) => {
            voiceService.stop();
            onNotification(i18n.t('voice_disabled') || 'Voice commands disabled', 'info');
          });
        }
      });
    }
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm(i18n.t('logout_confirm') || 'Are you sure you want to logout?')) {
        if (onLogout) {
          onLogout();
        } else {
          authAPIService.logout();
        }
      }
    });
  }
}
