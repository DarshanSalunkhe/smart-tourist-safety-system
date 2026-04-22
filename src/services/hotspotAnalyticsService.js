/**
 * Hotspot Analytics Service
 * Derives trend intelligence from incident data client-side.
 */

/**
 * @param {Array} incidents  — from incidentService.getIncidents()
 * @returns {{ cityTrends, unsafeHours, topCity, peakHour, nightEscalationRisk }}
 */
export function buildHotspotTrends(incidents) {
  const cityMap  = {};
  const hourMap  = {};

  incidents.forEach((inc) => {
    const city = inc.city || inc.state || 'Unknown';
    cityMap[city] = (cityMap[city] || 0) + 1;

    const hour = new Date(inc.created_at || inc.createdAt).getHours();
    if (!isNaN(hour)) {
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    }
  });

  // Top city by incident count
  const topCity = Object.entries(cityMap).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Peak hour
  const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Night escalation: % of incidents between 20:00–05:00
  const nightIncidents = incidents.filter(inc => {
    const h = new Date(inc.created_at || inc.createdAt).getHours();
    return !isNaN(h) && (h >= 20 || h < 5);
  }).length;
  const nightEscalationRisk = incidents.length > 0
    ? Math.round((nightIncidents / incidents.length) * 100)
    : 0;

  return { cityTrends: cityMap, unsafeHours: hourMap, topCity, peakHour, nightEscalationRisk };
}

/**
 * Format hour number → readable label.
 */
export function formatHour(hour) {
  if (hour === null || hour === undefined) return '—';
  const h = parseInt(hour);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}
