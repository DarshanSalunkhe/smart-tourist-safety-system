/**
 * LanguageSwitcher — reusable across all dashboards.
 * Renders a compact dropdown that persists language per device (localStorage).
 * Usage: document.getElementById('langSwitcherMount').innerHTML = createLanguageSwitcher();
 *        setupLanguageSwitcher();
 */

import { i18n, LANGUAGE_OPTIONS } from '../services/i18n.js';

/** Returns the HTML string for the switcher */
export function createLanguageSwitcher() {
  const current = LANGUAGE_OPTIONS.find(l => l.code === i18n.currentLang) || LANGUAGE_OPTIONS[0];
  return `
    <div class="lang-switcher" role="navigation" aria-label="Select dashboard language">
      <button class="lang-switcher-btn" id="langSwitcherBtn"
        aria-haspopup="listbox" aria-expanded="false"
        title="Change language">
        🌐 <span id="langSwitcherLabel">${current.label}</span>
      </button>
      <ul class="lang-switcher-menu" id="langSwitcherMenu" role="listbox" aria-label="Language options" style="display:none;">
        ${LANGUAGE_OPTIONS.map(l => `
          <li role="option"
            aria-selected="${l.code === i18n.currentLang}"
            data-lang="${l.code}"
            class="lang-switcher-option ${l.code === i18n.currentLang ? 'active' : ''}"
            tabindex="0">
            ${l.label}
          </li>`).join('')}
      </ul>
    </div>
    <style>
      .lang-switcher{position:relative;display:inline-block;}
      .lang-switcher-btn{display:flex;align-items:center;gap:.35rem;padding:.45rem .85rem;
        border-radius:var(--r-full,2rem);border:1.5px solid var(--border,#e2e8f0);
        background:var(--card,#fff);color:var(--text,#0f172a);font-size:.82rem;
        font-weight:600;cursor:pointer;font-family:inherit;min-height:44px;
        transition:all .15s ease;}
      .lang-switcher-btn:hover{border-color:var(--primary,#2563eb);background:var(--primary-subtle,rgba(37,99,235,.07));}
      .lang-switcher-btn:focus-visible{outline:2px solid var(--primary,#2563eb);outline-offset:2px;}
      .lang-switcher-menu{position:absolute;top:calc(100% + .4rem);right:0;
        background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);
        border-radius:var(--r-lg,1.125rem);box-shadow:0 8px 24px rgba(0,0,0,.12);
        min-width:140px;z-index:2000;padding:.35rem;list-style:none;margin:0;}
      .lang-switcher-option{padding:.55rem .85rem;border-radius:var(--r-md,.875rem);
        font-size:.85rem;cursor:pointer;color:var(--text,#0f172a);
        transition:background .12s ease;min-height:44px;display:flex;align-items:center;}
      .lang-switcher-option:hover,.lang-switcher-option:focus-visible{
        background:var(--primary-subtle,rgba(37,99,235,.07));outline:none;}
      .lang-switcher-option.active{font-weight:700;color:var(--primary,#2563eb);}
    </style>
  `;
}

/** Wire up the switcher after it's in the DOM */
export function setupLanguageSwitcher() {
  const btn  = document.getElementById('langSwitcherBtn');
  const menu = document.getElementById('langSwitcherMenu');
  if (!btn || !menu) return;

  const toggle = (open) => {
    menu.style.display = open ? 'block' : 'none';
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle(menu.style.display === 'none');
  });

  // Keyboard: Enter/Space opens, Escape closes
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(true); }
    if (e.key === 'Escape') toggle(false);
  });

  menu.querySelectorAll('.lang-switcher-option').forEach(opt => {
    const select = () => {
      const lang = opt.dataset.lang;
      toggle(false);
      if (lang !== i18n.currentLang) i18n.setLanguage(lang);
    };
    opt.addEventListener('click', select);
    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      if (e.key === 'Escape') { toggle(false); btn.focus(); }
    });
  });

  // Close on outside click
  document.addEventListener('click', () => toggle(false));
}
