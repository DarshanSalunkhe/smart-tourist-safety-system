/**
 * Dispatch Recommendation Service
 * Suggests authority actions based on incident type and severity.
 */

function recommendDispatch(incident) {
  const actions = [];

  if (incident.severity === 'critical') {
    actions.push('🚓 Dispatch nearest patrol immediately');
    actions.push('📞 Call tourist directly');
  }

  if (incident.severity === 'high' && actions.length === 0) {
    actions.push('🚓 Alert nearest patrol unit');
  }

  switch (incident.type) {
    case 'sos':
      actions.push('🚨 Activate emergency response protocol');
      actions.push('📡 Broadcast alert to all nearby units');
      break;
    case 'medical':
      actions.push('🚑 Dispatch ambulance support');
      actions.push('🏥 Notify nearest hospital');
      break;
    case 'harassment':
      actions.push('👮 Assign women safety response team');
      actions.push('📋 Log for pattern analysis');
      break;
    case 'theft':
      actions.push('🔍 Deploy plainclothes officers to area');
      actions.push('📷 Check CCTV footage request');
      break;
    case 'lost':
      actions.push('🗺️ Share safe route guidance');
      actions.push('📞 Contact tourist for last known location');
      break;
    default:
      if (actions.length === 0) {
        actions.push('📋 Review and assign to duty officer');
      }
  }

  return actions;
}

module.exports = { recommendDispatch };
