/**
 * i18n Manager — SafeTrip
 * Loads locale packs from src/i18n/*.js
 * To add a new language: create src/i18n/xx.js and add it to LOCALES below.
 * 
 * LANGUAGE STORAGE STRATEGY:
 * - User-specific: language_user_{userId} (preferred)
 * - Fallback: global 'language' key for backward compatibility
 * - Each user has independent language preference
 */

import en from '../i18n/en.js';
import hi from '../i18n/hi.js';
import mr from '../i18n/mr.js';
import ta from '../i18n/ta.js';
import te from '../i18n/te.js';

// Registry — add new languages here only
const LOCALES = { en, hi, mr, ta, te };

// Language display names for the dropdown
export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
];

class I18n {
  constructor() {
    // English is the default
    this.currentLang = 'en';
    this.currentUserId = null;
    this.listeners = [];
    
    // Load initial language (will be updated when user logs in)
    this._loadLanguage();
  }

  /**
   * Load language preference with fallback chain:
   * 1. User-specific preference (language_user_{userId})
   * 2. Global preference (language) - for backward compatibility
   * 3. Default (en)
   */
  _loadLanguage() {
    let savedLang = null;
    
    // Try user-specific preference first
    if (this.currentUserId) {
      const userKey = `language_user_${this.currentUserId}`;
      savedLang = localStorage.getItem(userKey);
      console.log(`[i18n] Loading language for user ${this.currentUserId}:`, savedLang);
    }
    
    // Fallback to global preference (backward compatibility)
    if (!savedLang) {
      savedLang = localStorage.getItem('language');
      console.log('[i18n] Using global language fallback:', savedLang);
    }
    
    // Apply if valid
    if (savedLang && LOCALES[savedLang]) {
      this.currentLang = savedLang;
      document.documentElement.setAttribute('data-lang', savedLang);
    } else {
      this.currentLang = 'en';
      document.documentElement.setAttribute('data-lang', 'en');
    }
  }

  /**
   * Set the current user ID and reload their language preference
   * Call this after login/authentication
   */
  setUserId(userId) {
    if (this.currentUserId === userId) return; // No change
    
    console.log(`[i18n] Setting user ID: ${userId}`);
    this.currentUserId = userId;
    this._loadLanguage();
    
    // Notify listeners of potential language change
    this.listeners.forEach(cb => cb(this.currentLang));
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang: this.currentLang } }));
  }

  /**
   * Clear user ID on logout
   */
  clearUserId() {
    console.log('[i18n] Clearing user ID');
    this.currentUserId = null;
    // Reset to default English on logout
    this.currentLang = 'en';
    document.documentElement.setAttribute('data-lang', 'en');
    this.listeners.forEach(cb => cb('en'));
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang: 'en' } }));
  }

  setLanguage(lang) {
    if (!LOCALES[lang]) { 
      console.warn(`[i18n] Unknown language: ${lang}`); 
      return; 
    }
    
    this.currentLang = lang;
    
    // Save to user-specific key if user is logged in
    if (this.currentUserId) {
      const userKey = `language_user_${this.currentUserId}`;
      localStorage.setItem(userKey, lang);
      console.log(`[i18n] Saved language for user ${this.currentUserId}:`, lang);
    } else {
      // Fallback to global key if no user (shouldn't happen in normal flow)
      localStorage.setItem('language', lang);
      console.log('[i18n] Saved language globally (no user ID):', lang);
    }
    
    // Use data-lang NOT lang= to avoid Chrome's "Translate page?" popup
    document.documentElement.setAttribute('data-lang', lang);
    this.listeners.forEach(cb => cb(lang));
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang } }));
  }

  /** Translate a key, falling back to English if missing */
  t(key) {
    return LOCALES[this.currentLang]?.[key] ?? LOCALES.en[key] ?? key;
  }

  getCurrentLanguage() { return this.currentLang; }

  onLanguageChange(cb) { this.listeners.push(cb); }
}

export const i18n = new I18n();

