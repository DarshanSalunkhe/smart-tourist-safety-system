/**
 * Risk Scoring Engine
 * Calculates real-time safety risk for a tourist based on:
 * - Time of day (night = higher risk)
 * - Proximity to known incident hotspots
 * - Isolation (no nearby active users)
 * - Movement (stationary too long)
 * - Active incidents in area
 */

import { locationService } from './location.js';
import { speakAlert } from './voiceService.js';
import { detectRouteDeviation, recordPosition } from './routeDeviationService.js';
import {
  RISK_THRESHOLDS, RISK_SCORES, VOICE_ALERT,
  RISK_EVAL_INTERVAL_MS, PREDICTIVE_CRITICAL_THRESHOLD
} from '../constants/riskConfig.js';
import { predictRisk } from './predictiveRiskService.js';

const RISK_LEVELS = {
  SAFE:   { label: 'Safe',        color: '#10b981', bg: 'rgba(16,185,129,.1)',  icon: '🟢', score: [0,  39] },
  MEDIUM: { label: 'Medium Risk', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', icon: '🟡', score: [40, 69] },
  HIGH:   { label: 'High Risk',   color: '#ef4444', bg: 'rgba(239,68,68,.1)',  icon: '🔴', score: [70, 100] }
};

class RiskEngine {
  constructor() {
    this.currentScore = 0;
    this.currentLevel = RISK_LEVELS.SAFE;
    this.factors = {};
    this.listeners = [];
    this.intervalId = null;
    this.lastMovementTime = Date.now();
    this.lastPosition = null;
    this.pathHistory = [];
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.evaluate(), RISK_EVAL_INTERVAL_MS);
    this.evaluate(); // immediate first run
    console.log('[RiskEngine] Started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  evaluate() {
    const location = locationService.getCurrentLocation();
    if (!location) return;

    const score = this._calculateScore(location);
    const level = this._scoreToLevel(score);

    const changed = score !== this.currentScore || level !== this.currentLevel;
    this.currentScore = score;
    this.currentLevel = level;

    if (changed) {
      this._notify();
      const predicted = predictRisk(score, this.factors);
      if (predicted >= PREDICTIVE_CRITICAL_THRESHOLD) {
        speakAlert("Caution. Risk may become critical soon.");
      } else if (score >= VOICE_ALERT.HIGH_RISK_SCORE) {
        speakAlert("Warning. You are in a high risk area.");
      } else if (this.factors.movement?.score >= VOICE_ALERT.MOVEMENT_WARN_SCORE) {
        speakAlert("No movement detected for a long time. Please confirm safety.");
      } else if (this.factors.zone?.score >= VOICE_ALERT.ZONE_WARN_SCORE) {
        speakAlert("Caution. You have entered a dangerous risk zone.");
      } else if (this.factors.route?.score) {
        speakAlert("Warning. Your route has changed unexpectedly.");
      }
    }

    return { score, level };
  }

  _calculateScore(location) {
    let score = 0;
    this.factors = {};

    // 1. Time of day risk (0-25 pts)
    const hour = new Date().getHours();
    let timeScore = 0;
    if (hour >= 22 || hour < 5)       timeScore = RISK_SCORES.TIME_LATE_NIGHT;
    else if (hour >= 20 || hour < 7)  timeScore = RISK_SCORES.TIME_EVENING;
    else if (hour >= 18)              timeScore = RISK_SCORES.TIME_DUSK;
    else                              timeScore = 0;
    this.factors.time = { score: timeScore, label: this._timeLabel(hour) };
    score += timeScore;

    // 2. Proximity to incident hotspots (0-35 pts)
    const incidents = this._getRecentIncidents();
    let hotspotScore = 0;
    let nearestIncident = null;
    let minDist = Infinity;

    incidents.forEach(inc => {
      if (!inc.location_lat || !inc.location_lng) return;
      const dist = this._haversine(
        location.lat, location.lng,
        parseFloat(inc.location_lat), parseFloat(inc.location_lng)
      );
      if (dist < minDist) { minDist = dist; nearestIncident = inc; }
      if (dist < 200)       hotspotScore = Math.max(hotspotScore, RISK_SCORES.HOTSPOT_200M);
      else if (dist < 500)  hotspotScore = Math.max(hotspotScore, RISK_SCORES.HOTSPOT_500M);
      else if (dist < 1000) hotspotScore = Math.max(hotspotScore, RISK_SCORES.HOTSPOT_1KM);
      else if (dist < 2000) hotspotScore = Math.max(hotspotScore, RISK_SCORES.HOTSPOT_2KM);
    });
    this.factors.hotspot = {
      score: hotspotScore,
      label: nearestIncident ? `${Math.round(minDist)}m from incident` : 'No nearby incidents'
    };
    score += hotspotScore;

    // 3. Risk zone proximity (0-25 pts)
    const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');
    let zoneScore = 0;
    zones.forEach(zone => {
      const dist = this._haversine(location.lat, location.lng, zone.lat, zone.lng);
      if (dist < zone.radius) {
        const zs = zone.risk === 'critical' ? RISK_SCORES.ZONE_CRITICAL
                 : zone.risk === 'high'     ? RISK_SCORES.ZONE_HIGH
                 : zone.risk === 'medium'   ? RISK_SCORES.ZONE_MEDIUM
                 : RISK_SCORES.ZONE_LOW;
        zoneScore = Math.max(zoneScore, zs);
      }
    });
    this.factors.zone = { score: zoneScore, label: zoneScore > 0 ? 'Inside risk zone' : 'Outside risk zones' };
    score += zoneScore;

    // 4. No movement for 20+ minutes (0-15 pts)
    const pos = location;
    if (this.lastPosition) {
      const moved = this._haversine(pos.lat, pos.lng, this.lastPosition.lat, this.lastPosition.lng);
      if (moved > 20) this.lastMovementTime = Date.now();
    }
    this.lastPosition = pos;
    const stationaryMins = (Date.now() - this.lastMovementTime) / 60000;
    let stationaryScore = 0;
    if (stationaryMins > 30)      stationaryScore = RISK_SCORES.STATIONARY_30M;
    else if (stationaryMins > 20) stationaryScore = RISK_SCORES.STATIONARY_20M;
    else if (stationaryMins > 10) stationaryScore = RISK_SCORES.STATIONARY_10M;
    this.factors.movement = {
      score: stationaryScore,
      label: stationaryMins > 5 ? `Stationary ${Math.round(stationaryMins)}m` : 'Moving normally'
    };
    score += stationaryScore;

    // 5. Route deviation (0-12 pts)
    recordPosition(this.pathHistory, location);
    if (detectRouteDeviation(this.pathHistory)) {
      this.factors.route = { score: RISK_SCORES.ROUTE_DEVIATION, label: 'Unexpected route deviation' };
      score += RISK_SCORES.ROUTE_DEVIATION;
    } else {
      this.factors.route = { score: 0, label: 'Route normal' };
    }

    return Math.min(100, score);
  }

  _scoreToLevel(score) {
    if (score >= RISK_THRESHOLDS.HIGH)   return RISK_LEVELS.HIGH;
    if (score >= RISK_THRESHOLDS.MEDIUM) return RISK_LEVELS.MEDIUM;
    return RISK_LEVELS.SAFE;
  }

  _timeLabel(hour) {
    if (hour >= 22 || hour < 5)  return 'Late night (high risk)';
    if (hour >= 20 || hour < 7)  return 'Evening / early morning';
    if (hour >= 18)              return 'Dusk';
    return 'Daytime (safe)';
  }

  _getRecentIncidents() {
    try {
      // Try from incidentService cache first
      const raw = localStorage.getItem('cachedIncidents');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const f1 = lat1 * Math.PI / 180, f2 = lat2 * Math.PI / 180;
    const df = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  onRiskChange(cb) {
    this.listeners.push(cb);
  }

  _notify() {
    this.listeners.forEach(cb => cb({
      score: this.currentScore,
      level: this.currentLevel,
      factors: this.factors
    }));
    window.dispatchEvent(new CustomEvent('riskUpdate', {
      detail: { score: this.currentScore, level: this.currentLevel, factors: this.factors }
    }));
  }

  getStatus() {
    const predictedScore = predictRisk(this.currentScore, this.factors);
    return {
      score: this.currentScore,
      predictedScore,
      level: this.currentLevel,
      factors: this.factors
    };
  }
}

export const riskEngine = new RiskEngine();
export { RISK_LEVELS };
