'use strict';

/**
 * SMS SOS Service — with retry, failure logging, DB audit trail, and partial failure handling.
 * Providers: twilio | fast2sms | mock (default)
 */

const SMS_PROVIDER = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
const SMS_MAX_RETRIES = 3;
const SMS_RETRY_DELAY_MS = 1500;

// Lazy-load pool to avoid circular dependency at startup
function getPool() {
  return require('../db').pool;
}

// ── DB audit log ───────────────────────────────────────────────────────────
async function logSMS({ userId, incidentId, to, message, status, providerId, error, attempt }) {
  try {
    await getPool().query(
      `INSERT INTO sms_logs (user_id, incident_id, to_number, message, provider, status, provider_id, error, attempt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId || null, incidentId || null, to, message.substring(0, 500),
       SMS_PROVIDER, status, providerId || null, error || null, attempt || 1]
    );
  } catch (e) {
    console.warn('[SMS] Failed to write audit log:', e.message);
  }
}

// ── Retry wrapper ──────────────────────────────────────────────────────────
async function withRetry(fn, label, retries = SMS_MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn(attempt);
      if (result.success) {
        if (attempt > 1) console.log(`[SMS] ${label} succeeded on attempt ${attempt}`);
        return result;
      }
      const code = result.data?.code;
      const unrecoverable = [21211, 21214, 21608, 21610, 21612].includes(code);
      if (unrecoverable) {
        console.warn(`[SMS] ${label} unrecoverable error ${code} — not retrying`);
        return result;
      }
      lastError = result.error || `status ${result.data?.status}`;
    } catch (e) {
      lastError = e.message;
    }
    if (attempt < retries) {
      console.warn(`[SMS] ${label} attempt ${attempt}/${retries} failed: ${lastError} — retrying in ${SMS_RETRY_DELAY_MS * attempt}ms`);
      await new Promise(r => setTimeout(r, SMS_RETRY_DELAY_MS * attempt));
    }
  }
  console.error(`[SMS] ${label} failed after ${retries} attempts: ${lastError}`);
  return { success: false, error: lastError, exhausted: true };
}

// ── Number normalisation ───────────────────────────────────────────────────
function normalise(number) {
  if (!number) return null;
  // Remove spaces, dashes, parentheses
  let cleaned = number.replace(/[\s\-()]/g, '');
  // If starts with 0, replace with +91
  if (cleaned.startsWith('0')) {
    cleaned = '+91' + cleaned.substring(1);
  }
  // If doesn't start with +, add +91 (for Indian numbers)
  else if (!cleaned.startsWith('+')) {
    cleaned = '+91' + cleaned;
  }
  return cleaned;
}

// ── Provider: Twilio ───────────────────────────────────────────────────────
async function sendTwilio(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM || process.env.SMS_FROM;

  if (!accountSid || !authToken || !from) {
    console.error('[SMS] Twilio credentials missing in .env');
    return { success: false, error: 'Twilio credentials not configured' };
  }

  const body = new URLSearchParams({ To: phone, From: from, Body: message });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );
  const data = await res.json();
  const success = !!data.sid;
  if (success) console.log(`[SMS] Twilio sent to ${phone}: ${data.sid} (${data.status})`);
  else console.error(`[SMS] Twilio failed to ${phone}: code=${data.code} msg=${data.message}`);
  return { success, data };
}

// ── Provider: Fast2SMS ─────────────────────────────────────────────────────
async function sendFast2SMS(phone, message) {
  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: process.env.SMS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ route: 'q', message, language: 'english', flash: 0, numbers: phone.replace('+91', '') })
  });
  const data = await res.json();
  const success = data.return === true;
  if (success) console.log(`[SMS] Fast2SMS sent to ${phone}`);
  else console.error(`[SMS] Fast2SMS failed to ${phone}:`, data);
  return { success, data };
}

// ── Provider: Mock ─────────────────────────────────────────────────────────
function mockSMS(phone, message) {
  console.log('📱 [SMS MOCK] ─────────────────────────────');
  console.log(`   To:      ${phone}`);
  console.log(`   Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  console.log('────────────────────────────────────────────');
  return { success: true, mock: true };
}

// ── Main send function ─────────────────────────────────────────────────────
async function sendSMS(to, message, context = {}) {
  const phone = normalise(to);
  if (!phone) return { success: false, error: 'No phone number provided' };

  const label = `SMS to ${phone}`;

  const wrappedFn = async (attempt) => {
    let result;
    switch (SMS_PROVIDER) {
      case 'twilio':    result = await sendTwilio(phone, message); break;
      case 'fast2sms':  result = await sendFast2SMS(phone, message); break;
      default:          result = mockSMS(phone, message); break;
    }
    // Log every attempt to DB
    await logSMS({
      userId: context.userId,
      incidentId: context.incidentId,
      to: phone,
      message,
      status: result.success ? 'sent' : 'failed',
      providerId: result.data?.sid || null,
      error: result.error || (result.success ? null : JSON.stringify(result.data)),
      attempt,
    });
    return result;
  };

  if (SMS_PROVIDER === 'mock') return wrappedFn(1);
  return withRetry((attempt) => wrappedFn(attempt), label);
}

// ── SOS alert — sends to emergency contact + own number ───────────────────
async function sendSOSAlert(user, location, incidentId = null) {
  if (!user?.emergency_contact && !user?.phone) {
    console.warn('[SMS] No contact number for SOS alert — skipping');
    return { sent: 0, failed: 0 };
  }

  const lat  = typeof location?.lat === 'number' ? location.lat.toFixed(5) : 'unknown';
  const lng  = typeof location?.lng === 'number' ? location.lng.toFixed(5) : 'unknown';
  const maps = lat !== 'unknown' ? `https://maps.google.com/?q=${lat},${lng}` : 'location unavailable';
  
  // Create unique message with timestamp
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const message =
    `SafeTrip Alert: SOS triggered by ${user.name}. ` +
    `Time: ${timeStr}, ${dateStr}. ` +
    `Location: ${lat}, ${lng}. ` +
    `Maps: ${maps}. ` +
    `Contact authorities (112) immediately.`;

  console.log('[SMS] Preparing SOS alert');
  console.log('[SMS] Recipient(s):', [user.emergency_contact, user.phone].filter(Boolean).join(', '));
  console.log('[SMS] Message:', message);

  const targets = [...new Set([user.emergency_contact, user.phone].filter(Boolean))];
  
  // Send with retry logic
  const results = await Promise.allSettled(
    targets.map(async (number) => {
      let lastError;
      // Try twice with 5 second delay
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[SMS] Attempt ${attempt}/2 to ${number}`);
          const result = await sendSMS(number, message, { userId: user.id, incidentId });
          if (result.success) {
            console.log(`[SMS] ✅ Success on attempt ${attempt} to ${number}`);
            return result;
          }
          lastError = result.error;
        } catch (e) {
          lastError = e.message;
        }
        
        if (attempt < 2) {
          console.log(`[SMS] Attempt ${attempt} failed, retrying in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
      
      throw new Error(lastError || 'Failed after 2 attempts');
    })
  );

  let sent = 0, failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.success) {
      sent++;
      console.log(`[SMS] ✅ Delivered to ${targets[i]}`);
    } else {
      failed++;
      console.error(`[SMS] ❌ Failed to ${targets[i]}:`, r.reason || r.value?.error);
    }
  });

  console.log(`[SMS] SOS alert complete: ${sent} sent, ${failed} failed out of ${targets.length} targets`);
  return { sent, failed, total: targets.length };
}

module.exports = { sendSMS, sendSOSAlert };
