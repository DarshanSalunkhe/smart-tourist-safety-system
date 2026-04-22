const QUEUE_KEY = 'offlineQueue';
import { incidentsAPI } from './apiClient.js';

export function queueOfflineEvent(type, payload) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ type, payload, createdAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log(`[OfflineSync] Queued ${type}, total queued: ${queue.length}`);
}

export function getQueueLength() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length;
}

export async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  console.log(`[OfflineSync] Syncing ${queue.length} queued events…`);
  const failed = [];

  for (const item of queue) {
    try {
      // Currently only 'incidents' type is queued — extend as needed
      if (item.type === 'incidents') {
        await incidentsAPI.create(item.payload);
      }
      console.log(`[OfflineSync] Synced ${item.type}`);
    } catch (e) {
      console.warn(`[OfflineSync] Failed to sync ${item.type}:`, e.message);
      failed.push(item);
    }
  }

  if (failed.length === 0) {
    localStorage.removeItem(QUEUE_KEY);
    console.log('[OfflineSync] All events synced and queue cleared');
    window.dispatchEvent(new CustomEvent('offlineSyncComplete', { detail: { synced: queue.length } }));
  } else {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    console.warn(`[OfflineSync] ${failed.length} events still pending`);
  }
}

window.addEventListener('online', () => {
  console.log('[OfflineSync] Back online — starting sync');
  syncOfflineQueue();
});

export function isOnline() {
  return navigator.onLine;
}
