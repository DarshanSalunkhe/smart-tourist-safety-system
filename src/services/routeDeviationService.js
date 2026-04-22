import { ROUTE_DEVIATION_THRESHOLD, PATH_HISTORY_MAX } from '../constants/riskConfig.js';

/**
 * Returns true if the last 3 positions show an abnormal direction change.
 * @param {Array<{lat: number, lng: number}>} pathHistory
 */
export function detectRouteDeviation(pathHistory) {
  if (pathHistory.length < 3) return false;

  const recent = pathHistory.slice(-3);

  const dx1 = recent[1].lat - recent[0].lat;
  const dx2 = recent[2].lat - recent[1].lat;
  const dy1 = recent[1].lng - recent[0].lng;
  const dy2 = recent[2].lng - recent[1].lng;

  const directionChange = Math.abs(dx2 - dx1) + Math.abs(dy2 - dy1);
  return directionChange > ROUTE_DEVIATION_THRESHOLD;
}

/**
 * Append a new position to the history, keeping only the last PATH_HISTORY_MAX points.
 */
export function recordPosition(history, position) {
  history.push({ lat: position.lat, lng: position.lng });
  if (history.length > PATH_HISTORY_MAX) history.shift();
}
