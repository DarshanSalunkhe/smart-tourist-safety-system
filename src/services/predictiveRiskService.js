/**
 * Predictive Risk Service
 * Projects the current risk score forward based on active factors,
 * giving a "where risk is heading" score rather than just where it is now.
 */

import {
  PREDICTIVE_TIME_BONUS,
  PREDICTIVE_ZONE_BONUS,
  PREDICTIVE_MOVEMENT_BONUS,
  PREDICTIVE_ROUTE_BONUS,
  PREDICTIVE_HOTSPOT_BONUS,
} from '../constants/riskConfig.js';

/**
 * @param {number} currentScore
 * @param {object} factors  — from riskEngine.factors
 * @returns {number} predicted score (0–100)
 */
export function predictRisk(currentScore, factors) {
  let predicted = currentScore;

  if (factors.time?.score     >= 15) predicted += PREDICTIVE_TIME_BONUS;
  if (factors.zone?.score     >= 10) predicted += PREDICTIVE_ZONE_BONUS;
  if (factors.movement?.score >= 10) predicted += PREDICTIVE_MOVEMENT_BONUS;
  if (factors.route?.score    >= 10) predicted += PREDICTIVE_ROUTE_BONUS;
  if (factors.hotspot?.score  >= 15) predicted += PREDICTIVE_HOTSPOT_BONUS;

  return Math.min(100, predicted);
}

/**
 * Human-readable label for a predicted score.
 */
export function predictedLabel(predictedScore) {
  if (predictedScore >= 85) return { label: 'Critical soon',  color: '#dc2626', icon: '🔴' };
  if (predictedScore >= 70) return { label: 'High risk soon', color: '#ef4444', icon: '🟠' };
  if (predictedScore >= 40) return { label: 'Rising risk',    color: '#f59e0b', icon: '🟡' };
  return                           { label: 'Stable',         color: '#10b981', icon: '🟢' };
}
