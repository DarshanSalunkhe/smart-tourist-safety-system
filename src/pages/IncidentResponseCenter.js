import { authAPIService } from '../services/auth-api.js';
import { incidentService } from '../services/incident.js';
import { i18n } from '../services/i18n.js';
import { formatToIST } from '../utils/time.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export function IncidentResponseCenter(incidentId) {
  console.log('[IncidentResponseCenter] Loading incident:', incidentId);
  
  const user = authAPIService.getCurrentUser();
  if (!user || user.role !== 'authority') {
    window.location.hash = '#/login';
    return '<div>Unauthorized</div>';
  }

  let incident = null;
  let tourist = null;
  let elapsedTimer = null;

  // Fetch incident data
  const incidents = incidentService.getIncidents();
  incident = incidents.find(inc => inc.id === incidentId);

  if (!incident) {
    return `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg);">
        <div class="card" style="max-width: 500px; text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
          <h2>Incident Not Found</h2>
          <p style="color: var(--text-light); margin: 1rem 0;">The incident ${incidentId} could not be found.</p>
          <button class="btn btn-primary" onclick="window.location.hash='#/authority'">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    `;
  }

  // Fetch tourist data
  setTimeout(async () => {
    try {
      console.log('[IncidentResponseCenter] Fetching tourist data for user_id:', incident.user_id);
      const response = await fetch(`${API_URL}/api/users`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('[IncidentResponseCenter] Users fetched:', data.users?.length);
        tourist = data.users?.find(u => u.id === incident.user_id);
        console.log('[IncidentResponseCenter] Tourist found:', tourist);
        console.log('[IncidentResponseCenter] Tourist phone:', tourist?.phone);
        updateTouristDetails();
      } else {
        console.error('[IncidentResponseCenter] Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('[IncidentResponseCenter] Error fetching tourist:', error);
    }
  }, 0);

  // Start elapsed timer
  setTimeout(() => {
    startElapsedTimer();
  }, 0);

  function startElapsedTimer() {
    const timerEl = document.getElementById('elapsedTimer');
    if (!timerEl) return;

    const updateTimer = () => {
      const now = new Date();
      const reported = new Date(incident.created_at);
      const diff = now - reported;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      timerEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    };

    updateTimer();
    elapsedTimer = setInterval(updateTimer, 1000);
  }

  function updateTouristDetails() {
    if (!tourist) {
      console.warn('[IncidentResponseCenter] No tourist data available');
      return;
    }
    
    console.log('[IncidentResponseCenter] Updating tourist details:', {
      name: tourist.name,
      phone: tourist.phone,
      email: tourist.email
    });
    
    const nameEl = document.getElementById('touristName');
    const phoneEl = document.getElementById('touristPhone');
    const emailEl = document.getElementById('touristEmail');
    const photoEl = document.getElementById('touristPhoto');
    const nationalityEl = document.getElementById('touristNationality');
    const emergencyEl = document.getElementById('touristEmergency');

    if (nameEl) nameEl.textContent = tourist.name || 'Unknown';
    if (phoneEl) phoneEl.textContent = tourist.phone || 'Phone number not available';
    if (emailEl) emailEl.textContent = tourist.email || 'N/A';
    if (nationalityEl) nationalityEl.textContent = tourist.nationality || 'N/A';
    if (emergencyEl) emergencyEl.textContent = tourist.emergency_contact || tourist.emergencyContact || 'N/A';
    
    if (photoEl && tourist.profile_photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      photoEl.src = `${API_URL}${tourist.profile_photo}`;
    }
  }

  function initializeMap() {
    if (typeof L === 'undefined') {
      console.warn('[IncidentResponseCenter] Leaflet not loaded, retrying...');
      setTimeout(initializeMap, 500);
      return;
    }

    const mapEl = document.getElementById('incidentMap');
    if (!mapEl) return;

    const lat = incident.location?.lat || 18.5204;
    const lng = incident.location?.lng || 73.8567;

    const map = L.map('incidentMap').setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add incident marker
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-incident-marker',
        html: `<div style="
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; animation: pulse 2s infinite;
        ">🚨</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(map);

    marker.bindPopup(`
      <div style="text-align: center; padding: 0.5rem;">
        <strong style="color: var(--danger);">🚨 ${incident.type.toUpperCase()}</strong><br>
        <span style="font-size: 0.85rem; color: var(--text-light);">
          ${formatToIST(incident.created_at)}
        </span>
      </div>
    `).openPopup();

    console.log('[IncidentResponseCenter] Map initialized');
  }

  setTimeout(() => {
    initializeMap();
    setupActionHandlers();
  }, 100);

  function setupActionHandlers() {
    // Call Tourist
    document.getElementById('callTourist')?.addEventListener('click', () => {
      if (tourist?.phone) {
        window.location.href = `tel:${tourist.phone}`;
      } else {
        showNotification('Phone number not available', 'warning');
      }
    });

    // WhatsApp Tourist
    document.getElementById('whatsappTourist')?.addEventListener('click', () => {
      if (tourist?.phone) {
        const phone = tourist.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=Hello, this is SafeTrip Authority. We received your alert and are here to help.`, '_blank');
      } else {
        showNotification('Phone number not available', 'warning');
      }
    });

    // Mark In Progress
    document.getElementById('markInProgress')?.addEventListener('click', async () => {
      try {
        await incidentService.updateIncidentStatus(incidentId, 'in-progress');
        showNotification('Incident marked as In Progress', 'success');
        addTimelineEntry('Marked as In Progress');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        showNotification('Failed to update status', 'error');
      }
    });

    // Mark Resolved
    document.getElementById('markResolved')?.addEventListener('click', async () => {
      if (confirm('Mark this incident as resolved?')) {
        try {
          await incidentService.updateIncidentStatus(incidentId, 'resolved');
          showNotification('Incident marked as Resolved', 'success');
          addTimelineEntry('Marked as Resolved');
          setTimeout(() => window.location.hash = '#/authority', 1500);
        } catch (error) {
          showNotification('Failed to update status', 'error');
        }
      }
    });

    // Dispatch Patrol
    document.getElementById('dispatchPatrol')?.addEventListener('click', () => {
      showNotification('Patrol dispatch request sent', 'success');
      addTimelineEntry('Patrol Dispatched');
    });

    // Notify Police
    document.getElementById('notifyPolice')?.addEventListener('click', () => {
      showNotification('Police notified', 'success');
      addTimelineEntry('Police Notified');
    });

    // Notify Ambulance
    document.getElementById('notifyAmbulance')?.addEventListener('click', () => {
      showNotification('Ambulance notified', 'success');
      addTimelineEntry('Ambulance Dispatched');
    });

    // Share Location
    document.getElementById('shareLocation')?.addEventListener('click', () => {
      const lat = incident.location?.lat;
      const lng = incident.location?.lng;
      if (lat && lng) {
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        navigator.clipboard.writeText(url);
        showNotification('Location link copied to clipboard', 'success');
      }
    });

    // Escalate
    document.getElementById('escalateIncident')?.addEventListener('click', () => {
      if (confirm('Escalate this incident to senior authorities?')) {
        showNotification('Incident escalated', 'warning');
        addTimelineEntry('Escalated to Senior Authority');
      }
    });
  }

  function addTimelineEntry(action) {
    const timeline = document.getElementById('timelineList');
    if (!timeline) return;

    const entry = document.createElement('div');
    entry.className = 'timeline-entry';
    entry.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-time">${new Date().toLocaleTimeString()}</div>
        <div class="timeline-action">${action}</div>
      </div>
    `;
    timeline.insertBefore(entry, timeline.firstChild);
  }

  function showNotification(message, type = 'info') {
    import('../utils/notify.js').then(({ toast }) => toast(message, type));
  }

  const severityColor = incident.severity === 'critical' ? 'var(--danger)' : 
                        incident.severity === 'high' ? 'var(--warning)' : 
                        incident.severity === 'medium' ? '#f59e0b' : 'var(--success)';

  const statusColor = incident.status === 'resolved' ? 'var(--success)' : 
                      incident.status === 'in-progress' ? 'var(--warning)' : 'var(--danger)';

  return `
    <style>
      .irc-container {
        min-height: 100vh;
        background: var(--bg);
        padding: 1.5rem;
      }
      .irc-header {
        background: var(--card);
        border-radius: var(--r-lg);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: var(--shadow-card);
        border: 1px solid var(--border);
      }
      .irc-title {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--text);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .irc-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .irc-meta-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .irc-meta-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-light);
      }
      .irc-meta-value {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text);
      }
      .irc-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }
      .irc-card {
        background: var(--card);
        border-radius: var(--r-lg);
        padding: 1.5rem;
        box-shadow: var(--shadow-card);
        border: 1px solid var(--border);
      }
      .irc-card-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .irc-detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }
      .irc-detail-row:last-child {
        border-bottom: none;
      }
      .irc-detail-label {
        font-size: 0.85rem;
        color: var(--text-light);
        font-weight: 500;
      }
      .irc-detail-value {
        font-size: 0.85rem;
        color: var(--text);
        font-weight: 600;
        text-align: right;
      }
      .irc-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.75rem;
      }
      .irc-action-btn {
        padding: 0.75rem 1rem;
        border-radius: var(--r);
        border: none;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--t);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-family: inherit;
      }
      .irc-action-btn.primary {
        background: linear-gradient(135deg, var(--primary), #6366f1);
        color: white;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
      }
      .irc-action-btn.success {
        background: linear-gradient(135deg, var(--success), #34d399);
        color: white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      .irc-action-btn.warning {
        background: linear-gradient(135deg, var(--warning), #fbbf24);
        color: white;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
      }
      .irc-action-btn.danger {
        background: linear-gradient(135deg, var(--danger), #f87171);
        color: white;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      }
      .irc-action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      .irc-map {
        height: 350px;
        border-radius: var(--r-md);
        overflow: hidden;
        border: 1px solid var(--border);
      }
      .timeline-entry {
        display: flex;
        gap: 1rem;
        padding: 0.75rem 0;
        position: relative;
      }
      .timeline-entry:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 7px;
        top: 30px;
        bottom: -10px;
        width: 2px;
        background: var(--border);
      }
      .timeline-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary);
        border: 3px solid var(--card);
        box-shadow: 0 0 0 2px var(--primary);
        flex-shrink: 0;
        margin-top: 2px;
      }
      .timeline-content {
        flex: 1;
      }
      .timeline-time {
        font-size: 0.75rem;
        color: var(--text-light);
        font-weight: 600;
      }
      .timeline-action {
        font-size: 0.9rem;
        color: var(--text);
        margin-top: 0.15rem;
      }
      .ai-recommendation {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(37, 99, 235, 0.08));
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: var(--r-lg);
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .ai-recommendation-title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--ai);
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .ai-recommendation-text {
        font-size: 0.875rem;
        color: var(--text);
        line-height: 1.6;
      }
      .tourist-photo {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--border);
        margin-bottom: 1rem;
      }
      @media (max-width: 768px) {
        .irc-grid {
          grid-template-columns: 1fr;
        }
        .irc-actions {
          grid-template-columns: 1fr 1fr;
        }
      }
    </style>

    <div class="irc-container">
      <!-- Back Button -->
      <button class="btn btn-ghost" onclick="window.location.hash='#/authority'" style="margin-bottom: 1rem;">
        ← Back to Dashboard
      </button>

      <!-- Header -->
      <div class="irc-header">
        <div class="irc-title">
          🚨 Incident Response Center
        </div>
        <div class="irc-meta">
          <div class="irc-meta-item">
            <div class="irc-meta-label">Incident ID</div>
            <div class="irc-meta-value">${incident.id}</div>
          </div>
          <div class="irc-meta-item">
            <div class="irc-meta-label">Severity</div>
            <div class="irc-meta-value" style="color: ${severityColor}; text-transform: uppercase;">
              ${incident.severity}
            </div>
          </div>
          <div class="irc-meta-item">
            <div class="irc-meta-label">Status</div>
            <div class="irc-meta-value" style="color: ${statusColor}; text-transform: capitalize;">
              ${incident.status}
            </div>
          </div>
          <div class="irc-meta-item">
            <div class="irc-meta-label">Time Reported</div>
            <div class="irc-meta-value" style="font-size: 0.85rem;">
              ${formatToIST(incident.created_at)}
            </div>
          </div>
          <div class="irc-meta-item">
            <div class="irc-meta-label">Elapsed Time</div>
            <div class="irc-meta-value" id="elapsedTimer" style="color: var(--danger);">
              Calculating...
            </div>
          </div>
        </div>
      </div>

      <!-- AI Recommendation -->
      <div class="ai-recommendation">
        <div class="ai-recommendation-title">
          🤖 AI Recommendation
        </div>
        <div class="ai-recommendation-text">
          <strong>Suggested Action:</strong> ${
            incident.severity === 'critical' 
              ? 'Immediate dispatch recommended. Tourist may be in danger. Contact within 2 minutes.'
              : incident.severity === 'high'
              ? 'High priority response needed. Assign patrol and contact tourist within 5 minutes.'
              : 'Standard response protocol. Contact tourist and assess situation within 15 minutes.'
          }
        </div>
      </div>

      <!-- Main Grid -->
      <div class="irc-grid">
        <!-- Tourist Details -->
        <div class="irc-card">
          <div class="irc-card-title">👤 Tourist Details</div>
          <div style="text-align: center; margin-bottom: 1rem;">
            <img id="touristPhoto" src="/default-avatar.png" alt="Tourist" class="tourist-photo" onerror="this.src='/default-avatar.png'">
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Full Name</div>
            <div class="irc-detail-value" id="touristName">Loading...</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Phone Number</div>
            <div class="irc-detail-value" id="touristPhone">Loading...</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Email</div>
            <div class="irc-detail-value" id="touristEmail">Loading...</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Nationality</div>
            <div class="irc-detail-value" id="touristNationality">Loading...</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Emergency Contact</div>
            <div class="irc-detail-value" id="touristEmergency">Loading...</div>
          </div>
        </div>

        <!-- Location Details -->
        <div class="irc-card">
          <div class="irc-card-title">📍 Location Details</div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">State</div>
            <div class="irc-detail-value">${incident.location?.state || 'N/A'}</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">City</div>
            <div class="irc-detail-value">${incident.location?.city || 'N/A'}</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">GPS Coordinates</div>
            <div class="irc-detail-value">
              ${incident.location?.lat?.toFixed(4) || 'N/A'}, ${incident.location?.lng?.toFixed(4) || 'N/A'}
            </div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Address</div>
            <div class="irc-detail-value">${incident.location?.address || 'Fetching...'}</div>
          </div>
          <div class="irc-detail-row">
            <div class="irc-detail-label">Last Updated</div>
            <div class="irc-detail-value">${formatToIST(incident.updated_at || incident.created_at)}</div>
          </div>
        </div>
      </div>

      <!-- Map -->
      <div class="irc-card" style="margin-bottom: 1.5rem;">
        <div class="irc-card-title">🗺️ Live Location Map</div>
        <div id="incidentMap" class="irc-map"></div>
      </div>

      <!-- Incident Details -->
      <div class="irc-card" style="margin-bottom: 1.5rem;">
        <div class="irc-card-title">📋 Incident Information</div>
        <div class="irc-detail-row">
          <div class="irc-detail-label">Type</div>
          <div class="irc-detail-value" style="text-transform: uppercase; color: var(--danger);">
            ${incident.type}
          </div>
        </div>
        <div class="irc-detail-row">
          <div class="irc-detail-label">Description</div>
          <div class="irc-detail-value">${incident.description || 'No description provided'}</div>
        </div>
        <div class="irc-detail-row">
          <div class="irc-detail-label">Source</div>
          <div class="irc-detail-value">${incident.method || 'Manual'}</div>
        </div>
        ${incident.voiceTranscript ? `
          <div class="irc-detail-row">
            <div class="irc-detail-label">Voice Transcript</div>
            <div class="irc-detail-value">"${incident.voiceTranscript}"</div>
          </div>
        ` : ''}
      </div>

      <!-- Action Panel -->
      <div class="irc-card" style="margin-bottom: 1.5rem;">
        <div class="irc-card-title">⚡ Quick Actions</div>
        <div class="irc-actions">
          <button id="callTourist" class="irc-action-btn primary">
            📞 Call Tourist
          </button>
          <button id="whatsappTourist" class="irc-action-btn success">
            💬 WhatsApp
          </button>
          <button id="dispatchPatrol" class="irc-action-btn warning">
            🚓 Dispatch Patrol
          </button>
          <button id="notifyPolice" class="irc-action-btn danger">
            🚨 Notify Police
          </button>
          <button id="notifyAmbulance" class="irc-action-btn danger">
            🚑 Ambulance
          </button>
          <button id="shareLocation" class="irc-action-btn primary">
            📍 Share Location
          </button>
          <button id="markInProgress" class="irc-action-btn warning">
            ⏳ Mark In Progress
          </button>
          <button id="markResolved" class="irc-action-btn success">
            ✅ Mark Resolved
          </button>
          <button id="escalateIncident" class="irc-action-btn danger">
            ⚠️ Escalate
          </button>
        </div>
      </div>

      <!-- Timeline -->
      <div class="irc-card">
        <div class="irc-card-title">📅 Timeline</div>
        <div id="timelineList">
          <div class="timeline-entry">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-time">${formatToIST(incident.created_at)}</div>
              <div class="timeline-action">🚨 ${incident.type.toUpperCase()} Alert Triggered</div>
            </div>
          </div>
          ${incident.status === 'in-progress' || incident.status === 'resolved' ? `
            <div class="timeline-entry">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-time">${formatToIST(incident.updated_at || incident.created_at)}</div>
                <div class="timeline-action">Authority Opened Incident</div>
              </div>
            </div>
          ` : ''}
          ${incident.status === 'resolved' ? `
            <div class="timeline-entry">
              <div class="timeline-dot" style="background: var(--success);"></div>
              <div class="timeline-content">
                <div class="timeline-time">${formatToIST(incident.updated_at || incident.created_at)}</div>
                <div class="timeline-action">✅ Incident Resolved</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}
