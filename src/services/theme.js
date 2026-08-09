/**
 * Theme Manager — SafeTrip
 * Manages user-specific theme preferences (light/dark mode)
 * 
 * THEME STORAGE STRATEGY:
 * - User-specific: theme_user_{userId} (preferred)
 * - Fallback: global 'theme' key for backward compatibility
 * - Each user has independent theme preference
 * - Follows the same pattern as i18n service
 */

class ThemeService {
  constructor() {
    this.currentTheme = 'light';
    this.currentUserId = null;
    
    // Load initial theme (will be updated when user logs in)
    this._loadTheme();
  }

  /**
   * Load theme preference with fallback chain:
   * 1. User-specific preference (theme_user_{userId})
   * 2. Global preference (theme) - for backward compatibility
   * 3. Default (light)
   */
  _loadTheme() {
    let savedTheme = null;
    
    // Try user-specific preference first
    if (this.currentUserId) {
      const userKey = `theme_user_${this.currentUserId}`;
      savedTheme = localStorage.getItem(userKey);
      console.log(`[Theme] Loading theme for user ${this.currentUserId}:`, savedTheme);
    }
    
    // Fallback to global preference (backward compatibility)
    if (!savedTheme) {
      savedTheme = localStorage.getItem('theme');
      
      // If we have a global theme and a logged-in user, migrate it once
      if (savedTheme && this.currentUserId) {
        console.log(`[Theme] Migrating global theme "${savedTheme}" to user ${this.currentUserId}`);
        const userKey = `theme_user_${this.currentUserId}`;
        localStorage.setItem(userKey, savedTheme);
        // Don't remove global theme yet - other users might need it
      }
    }
    
    // Apply theme or default to light
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = 'light';
    }
    
    this._applyTheme(this.currentTheme);
  }

  /**
   * Apply theme to document
   */
  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Set the current user ID and reload their theme preference
   * Call this after login/authentication
   */
  setUserId(userId) {
    if (this.currentUserId === userId) return; // No change
    
    console.log(`[Theme] Setting user ID: ${userId}`);
    this.currentUserId = userId;
    this._loadTheme();
  }

  /**
   * Clear user ID on logout and reset to light theme
   */
  clearUserId() {
    console.log('[Theme] Clearing user ID');
    this.currentUserId = null;
    // Reset to default light theme on logout
    this.currentTheme = 'light';
    this._applyTheme('light');
  }

  /**
   * Set theme for current user
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`[Theme] Invalid theme: ${theme}`);
      return;
    }
    
    this.currentTheme = theme;
    
    // Save to user-specific key if user is logged in
    if (this.currentUserId) {
      const userKey = `theme_user_${this.currentUserId}`;
      localStorage.setItem(userKey, theme);
      console.log(`[Theme] Saved theme for user ${this.currentUserId}:`, theme);
    } else {
      // Fallback to global key if no user (shouldn't happen in normal flow)
      localStorage.setItem('theme', theme);
      console.log('[Theme] Saved theme globally (no user ID):', theme);
    }
    
    // Apply immediately
    this._applyTheme(theme);
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Check if dark mode is active
   */
  isDark() {
    return this.currentTheme === 'dark';
  }
}

export const themeService = new ThemeService();
