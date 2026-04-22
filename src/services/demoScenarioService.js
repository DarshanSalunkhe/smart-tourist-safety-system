/**
 * Demo Scenario Service
 * Runs a guided simulation for hackathon / placement demos.
 * Each step fires 4 seconds apart and narrates the full SafeTrip story.
 */

import { speakAlert } from './voiceService.js';
import { queueOfflineEvent } from './offlineSyncService.js';
import { riskEngine } from './risk-engine.js';
import { toast } from '../utils/notify.js';

const STEP_DELAY = 4000; // ms between steps

export function runDemoScenario() {
  toast('🎭 Demo scenario starting…', 'info');

  const steps = [
    // Step 0 — intro
    () => {
      speakAlert("Demo started. Tourist entering medium risk zone.");
      toast('📍 Step 1: Tourist entering medium risk zone', 'info');
    },

    // Step 1 — simulate zone risk
    () => {
      window.dispatchEvent(new CustomEvent('simulateZoneRisk', {
        detail: { score: 18, label: 'Inside risk zone' }
      }));
      toast('⚠️ Step 2: Risk zone detected — score rising', 'warning');
      speakAlert("Caution. You have entered a dangerous risk zone.");
    },

    // Step 2 — simulate route deviation
    () => {
      window.dispatchEvent(new CustomEvent('simulateRouteDeviation', {
        detail: { score: 12, label: 'Unexpected route deviation' }
      }));
      toast('🗺️ Step 3: Route deviation detected', 'warning');
      speakAlert("Warning. Your route has changed unexpectedly.");
    },

    // Step 3 — risk goes high
    () => {
      window.dispatchEvent(new CustomEvent('simulateHighRisk', {
        detail: { score: 78 }
      }));
      toast('🔴 Step 4: Risk score critical — SOS triggered', 'error');
      speakAlert("Warning. You are in a high risk area.");
    },

    // Step 4 — SOS fails, queued offline
    () => {
      queueOfflineEvent('incidents', {
        userId: 'demo-tourist-1',
        type: 'sos',
        severity: 'critical',
        description: 'Demo SOS — backend unreachable',
        city: 'Demo City',
        method: 'button'
      });
      toast('📵 Step 5: Backend unreachable — SOS queued offline', 'error');
      speakAlert("SOS queued offline. SMS fallback ready.");
    },

    // Step 5 — SMS fallback shown
    () => {
      toast('📱 Step 6: SMS fallback text generated for emergency contact', 'warning');
      speakAlert("Emergency SMS text is ready. Share your location now.");
    },

    // Step 6 — reconnect + sync
    () => {
      toast('🌐 Step 7: Connection restored — syncing offline queue…', 'success');
      window.dispatchEvent(new Event('online'));
      speakAlert("Back online. Syncing emergency data to authorities.");
    },

    // Step 7 — authority sees alert
    () => {
      window.dispatchEvent(new CustomEvent('newIncident', {
        detail: {
          id: 'demo-incident-' + Date.now(),
          type: 'sos',
          severity: 'critical',
          description: 'Demo SOS synced from offline queue',
          userId: 'demo-tourist-1',
          status: 'new',
          dispatchSuggestions: [
            '🚓 Dispatch nearest patrol immediately',
            '📞 Call tourist directly',
            '🚨 Activate emergency response protocol'
          ]
        }
      }));
      toast('🚔 Step 8: Authority alerted — AI dispatch suggestions ready', 'success');
      speakAlert("Authority control room has been notified. Dispatch recommended.");
    },

    // Step 8 — hotspot analytics update
    () => {
      window.dispatchEvent(new CustomEvent('demoHotspotUpdate', {
        detail: { city: 'Demo City', hour: new Date().getHours() }
      }));
      toast('📊 Step 9: Hotspot analytics updated — Demo City flagged', 'success');
      speakAlert("Demo complete. All SafeTrip intelligence layers demonstrated.");
    }
  ];

  steps.forEach((fn, i) => setTimeout(fn, i * STEP_DELAY));
}
