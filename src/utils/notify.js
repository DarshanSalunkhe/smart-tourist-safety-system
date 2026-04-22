/**
 * Unified notification utility.
 * Replaces all scattered toast/overlay implementations across the app.
 *
 * Usage:
 *   import { toast, modal } from '../utils/notify.js';
 *   toast('Saved!', 'success');
 *   modal({ title: '🚨 Alert', body: '...', onConfirm: () => {} });
 */

// ─── Toast ────────────────────────────────────────────────────────────────────

const TOAST_DURATION_MS = 5000;

/**
 * Show a slide-in toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration  ms before auto-dismiss (0 = sticky)
 */
export function toast(message, type = 'info', duration = TOAST_DURATION_MS) {
  _injectToastStyles();

  const el = document.createElement('div');
  el.className = `st-toast st-toast--${type}`;
  el.textContent = message;

  const colors = {
    success: 'var(--success, #10b981)',
    error:   'var(--danger,  #ef4444)',
    warning: 'var(--warning, #f59e0b)',
    info:    'var(--primary, #2563eb)',
  };

  el.style.borderLeftColor = colors[type] ?? colors.info;
  document.body.appendChild(el);

  // Trigger enter animation
  requestAnimationFrame(() => el.classList.add('st-toast--visible'));

  if (duration > 0) {
    setTimeout(() => _dismissToast(el), duration);
  }

  return el; // caller can dismiss early if needed
}

function _dismissToast(el) {
  el.classList.remove('st-toast--visible');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
}

let _toastStylesInjected = false;
function _injectToastStyles() {
  if (_toastStylesInjected) return;
  _toastStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .st-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--card, #fff);
      color: var(--text, #111);
      padding: 0.85rem 1.25rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 16px rgba(0,0,0,.15);
      border-left: 4px solid var(--primary, #2563eb);
      font-size: 0.875rem;
      max-width: 340px;
      z-index: 9998;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity .25s ease, transform .25s ease;
      pointer-events: none;
    }
    .st-toast--visible {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
}

// ─── Modal overlay ────────────────────────────────────────────────────────────

/**
 * Show a centered modal overlay.
 * @param {object} opts
 * @param {string}   opts.title
 * @param {string}   opts.body        HTML string for the body
 * @param {string}   [opts.confirmText]  default 'OK'
 * @param {string}   [opts.cancelText]   if provided, shows a cancel button
 * @param {Function} [opts.onConfirm]
 * @param {Function} [opts.onCancel]
 * @returns {HTMLElement} overlay element
 */
export function modal({ title, body, confirmText = 'OK', cancelText, onConfirm, onCancel } = {}) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:1rem;
  `;

  overlay.innerHTML = `
    <div style="background:var(--card,#fff);border-radius:1rem;padding:1.5rem;
                max-width:380px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.25);">
      <div style="font-size:1.1rem;font-weight:600;margin-bottom:.75rem;">${title ?? ''}</div>
      <div style="font-size:.9rem;color:var(--text-light,#6b7280);margin-bottom:1.25rem;">${body ?? ''}</div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;">
        ${cancelText ? `<button id="st-modal-cancel" style="padding:.55rem 1.1rem;border-radius:.5rem;border:1px solid var(--border,#e5e7eb);background:var(--bg,#f9fafb);cursor:pointer;font-size:.85rem;">${cancelText}</button>` : ''}
        <button id="st-modal-confirm" style="padding:.55rem 1.1rem;border-radius:.5rem;border:none;background:var(--primary,#2563eb);color:#fff;cursor:pointer;font-size:.85rem;">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#st-modal-confirm').addEventListener('click', () => {
    overlay.remove();
    onConfirm?.();
  });

  overlay.querySelector('#st-modal-cancel')?.addEventListener('click', () => {
    overlay.remove();
    onCancel?.();
  });

  return overlay;
}
