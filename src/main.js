import { initRouter, renderCurrentRoute } from './router.js';
import { authService } from './services/auth.js';
import { i18n } from './services/i18n.js';
import { initializeDemoData } from './services/demo-data.js';

console.log('🚀 Smart Tourist Safety System - Starting...');

// Apply saved theme immediately to prevent flash
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Initialize app
function initApp() {
  try {
    console.log('📱 Initializing application...');
    
    const app = document.getElementById('app');
    const loading = document.getElementById('loading');
    
    if (!app) {
      console.error('❌ App element not found!');
      return;
    }
    
    // Initialize demo data
    console.log('📊 Initializing demo data...');
    initializeDemoData();
    
    // Check authentication
    const user = authService.getCurrentUser();
    console.log('👤 Current user:', user ? user.email : 'Not logged in');
    
    if (!user && !window.location.hash.includes('login') && !window.location.hash.includes('register')) {
      console.log('🔐 Redirecting to login...');
      window.location.hash = '#/login';
    }
    
    // Initialize router
    console.log('🗺️ Initializing router...');
    initRouter(app);

    // Language is already set in i18n constructor from localStorage.
    // Just sync the data-lang attribute — no event fired, no re-render needed.
    document.documentElement.setAttribute('data-lang', i18n.currentLang);
    console.log('🌐 Language:', i18n.currentLang);

    // First-launch language suggestion (shown only once, never auto-forces)
    if (!localStorage.getItem('language') && !localStorage.getItem('langSuggested')) {
      localStorage.setItem('langSuggested', '1');
      const browserLang = (navigator.language || '').toLowerCase();
      const suggest = browserLang.startsWith('hi') ? 'hi'
                    : browserLang.startsWith('mr') ? 'mr'
                    : browserLang.startsWith('ta') ? 'ta'
                    : browserLang.startsWith('te') ? 'te'
                    : null;
      if (suggest) {
        const label = { hi: 'हिन्दी', mr: 'मराठी', ta: 'தமிழ்', te: 'తెలుగు' }[suggest];
        const banner = document.createElement('div');
        banner.style.cssText = `position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);
          background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);
          border-radius:var(--r-xl,1.5rem);padding:.75rem 1.25rem;
          box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:9999;
          display:flex;align-items:center;gap:.75rem;font-size:.85rem;font-family:inherit;`;
        banner.innerHTML = `
          <span>🌐 Suggested language: <strong>${label}</strong></span>
          <button id="langAcceptBtn" style="padding:.35rem .85rem;border-radius:2rem;
            border:none;background:#2563eb;color:#fff;cursor:pointer;font-size:.82rem;">
            Use ${label}
          </button>
          <button id="langDismissBtn" style="padding:.35rem .75rem;border-radius:2rem;
            border:1px solid #e2e8f0;background:transparent;cursor:pointer;font-size:.82rem;">
            Keep English
          </button>`;
        document.body.appendChild(banner);
        document.getElementById('langAcceptBtn').addEventListener('click', () => {
          i18n.setLanguage(suggest);
          banner.remove();
        });
        document.getElementById('langDismissBtn').addEventListener('click', () => banner.remove());
      }
    }

    // Re-render current route on language change — router owns rendering
    window.addEventListener('languageChange', (e) => {
      console.log('🌐 Language changed to:', e.detail.lang, '— re-rendering...');
      // Capture active sub-view BEFORE re-render wipes the DOM
      const activeView = document.querySelector('.nav-item.active')?.dataset?.view || null;
      renderCurrentRoute();
      // After re-render, click back into the same sub-view (e.g. settings)
      if (activeView) {
        setTimeout(() => {
          document.querySelector(`.nav-item[data-view="${activeView}"]`)?.click();
        }, 150);
      }
    });
    
    // Hide loading screen
    if (loading) {
      setTimeout(() => {
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.3s';
        setTimeout(() => loading.remove(), 300);
      }, 500);
    }
    
    console.log('✅ Application initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing app:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h1 style="color: #ef4444;">⚠️ Error Loading Application</h1>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Reload Page
          </button>
        </div>
      `;
    }
    const loading = document.getElementById('loading');
    if (loading) loading.remove();
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM is already ready
  initApp();
}
