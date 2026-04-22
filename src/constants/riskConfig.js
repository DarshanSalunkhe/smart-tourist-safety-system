// Central risk engine configuration
// Change values here to tune scoring across the entire app

export const RISK_THRESHOLDS = {
  HIGH:   70,
  MEDIUM: 40,
};

export const RISK_SCORES = {
  // Time of day (factor 1) — max 25 pts
  TIME_LATE_NIGHT:  25, // 22:00 – 05:00
  TIME_EVENING:     15, // 20:00 – 07:00
  TIME_DUSK:         8, // 18:00 – 20:00

  // Hotspot proximity (factor 2) — max 35 pts
  HOTSPOT_200M:  35,
  HOTSPOT_500M:  25,
  HOTSPOT_1KM:   15,
  HOTSPOT_2KM:    8,

  // Risk zone (factor 3) — max 25 pts
  ZONE_CRITICAL: 25,
  ZONE_HIGH:     18,
  ZONE_MEDIUM:   10,
  ZONE_LOW:       5,

  // Stationary (factor 4) — max 15 pts
  STATIONARY_30M: 15,
  STATIONARY_20M: 10,
  STATIONARY_10M:  5,

  // Route deviation (factor 5) — max 12 pts
  ROUTE_DEVIATION: 12,
};

// Voice alert trigger thresholds
export const VOICE_ALERT = {
  HIGH_RISK_SCORE:       RISK_THRESHOLDS.HIGH, // 70
  MOVEMENT_WARN_SCORE:   10,
  ZONE_WARN_SCORE:       RISK_SCORES.ZONE_HIGH, // 18
};

// Route deviation sensitivity (degrees lat/lng delta)
export const ROUTE_DEVIATION_THRESHOLD = 0.005;

// Polling interval for risk engine (ms)
export const RISK_EVAL_INTERVAL_MS = 15000;

// Max path history points kept for deviation detection
export const PATH_HISTORY_MAX = 10;

// ─── Predictive risk bonuses ──────────────────────────────────────────────────
// Added on top of current score to forecast near-future risk
export const PREDICTIVE_TIME_BONUS      = 10; // evening trending toward night
export const PREDICTIVE_ZONE_BONUS      = 12; // inside a risk zone
export const PREDICTIVE_MOVEMENT_BONUS  =  8; // stationary too long
export const PREDICTIVE_ROUTE_BONUS     = 10; // route deviation detected
export const PREDICTIVE_HOTSPOT_BONUS   = 15; // near incident hotspot

// Threshold above which a predictive voice warning fires
export const PREDICTIVE_CRITICAL_THRESHOLD = 85;
