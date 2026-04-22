/**
 * Smart Alert Engine
 * Triggers intelligent alerts based on:
 * - No movement for extended period
 * - Entering unsafe area
 * - Device going offline
 * - Risk score crossing thresholds
 */

import { riskEngine, RISK_LEVELS } from './risk-engine.js';

class SmartAlerts {
  constructor() {
    this.enabled = true;
    this.lastAlertTime = {};   // throttle per alert type
    this.THROTTLE_MS = 5 * 60 * 1000; // 5 min between same alert type
    this.prevRiskLevel = null;
  }

  start() {
    // Listen for risk changes
    window.addEventListener('riskUpdate', (e) => {
      if (!this.enabled) return;
      this._handleRiskChange(e.detail);
    });

    // Listen for offline
    window.addEventListener('offline', () => {
      if (!this.enabled) return;
      this._trigger('offline', '📵 You went offline. Emergency mode active.', 'warning');
    });

    window.addEventListener('online', () => {
      this._trigger('online', '✅ Connection restored.', 'success');
    });

    console.log('[SmartAlerts] Started');
  }

  _handleRiskChange({ score, level, factors }) {
    // Alert when risk level increases
    if (this.prevRiskLevel === RISK_LEVELS.SAFE && level === RISK_LEVELS.MEDIUM) {
      this._trigger('risk_medium', '⚠️ Medium risk area detected. Stay alert.', 'warning');
    }
    if (level === RISK_LEVELS.HIGH && this.prevRiskLevel !== RISK_LEVELS.HIGH) {
      this._trigger('risk_high', '🚨 High risk area! Consider moving to a safer location.', 'danger');
    }

    // Stationary alert
    if (factors.movement?.score >= 10) {
      this._trigger('stationary', `⏱️ ${factors.movement.label}. Are you okay?`, 'warning');
    }

    this.prevRiskLevel = level;
  }

  _trigger(type, message, severity = 'info') {
    const now = Date.now();
    if (this.lastAlertTime[type] && now - this.lastAlertTime[type] < this.THROTTLE_MS) return;
    this.lastAlertTime[type] = now;

    console.log(`[SmartAlerts] ${type}:`, message);

    window.dispatchEvent(new CustomEvent('smartAlert', {
      detail: { type, message, severity, timestamp: new Date().toISOString() }
    }));
  }

  setEnabled(val) {
    this.enabled = val;
  }
}

export const smartAlerts = new SmartAlerts();
