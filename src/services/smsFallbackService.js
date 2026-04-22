/**
 * SMS Fallback Service
 * Used when backend is unreachable during an emergency.
 * Generates a pre-filled SMS text the user can copy or send manually.
 */

export function generateEmergencySMS(location, riskScore) {
  const lat = location?.lat?.toFixed(5) ?? 'unknown';
  const lng = location?.lng?.toFixed(5) ?? 'unknown';
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  return `HELP! I may be unsafe. My location: ${lat}, ${lng}. Maps: ${mapsLink}. Risk score: ${riskScore}/100. Please contact authorities immediately.`;
}

/**
 * Show the SMS fallback UI — copies to clipboard and shows a dialog.
 * Call this when a POST /api/incidents or SOS request fails.
 */
export function triggerSMSFallback(location, riskScore) {
  const smsText = generateEmergencySMS(location, riskScore);

  // Try to copy to clipboard silently
  if (navigator.clipboard) {
    navigator.clipboard.writeText(smsText).catch(() => {});
  }

  // Build a non-blocking overlay instead of alert()
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:1rem;
  `;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:1rem;padding:1.5rem;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.3);">
      <div style="font-size:1.5rem;margin-bottom:.5rem;">🚨 Backend Unreachable</div>
      <p style="font-size:.9rem;color:#374151;margin-bottom:1rem;">
        Send this SMS to your emergency contact or call <strong>112</strong>:
      </p>
      <textarea readonly style="width:100%;height:110px;font-size:.82rem;border:1px solid #e5e7eb;border-radius:.5rem;padding:.5rem;resize:none;background:#f9fafb;">${smsText}</textarea>
      <div style="display:flex;gap:.5rem;margin-top:1rem;">
        <button id="smsCopyBtn" style="flex:1;padding:.6rem;background:#2563eb;color:#fff;border:none;border-radius:.5rem;cursor:pointer;font-size:.85rem;">
          📋 Copy
        </button>
        <button id="smsDismissBtn" style="flex:1;padding:.6rem;background:#e5e7eb;color:#111;border:none;border-radius:.5rem;cursor:pointer;font-size:.85rem;">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#smsCopyBtn').addEventListener('click', () => {
    navigator.clipboard?.writeText(smsText).catch(() => {});
    overlay.querySelector('#smsCopyBtn').textContent = '✅ Copied!';
  });
  overlay.querySelector('#smsDismissBtn').addEventListener('click', () => overlay.remove());
}
