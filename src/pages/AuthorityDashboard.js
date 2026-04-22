import { authAPIService } from '../services/auth-api.js';
import { incidentService } from '../services/incident.js';
import { i18n } from '../services/i18n.js';
import { locationDataService } from '../services/location-data.js';
import { createLocationFilter, setupLocationFilterHandlers } from '../components/LocationFilter.js';
import { formatToIST, formatTimeIST } from '../utils/time.js';
import { buildHotspotTrends, formatHour } from '../services/hotspotAnalyticsService.js';
import { runDemoScenario } from '../services/demoScenarioService.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export function AuthorityDashboard() {
  const user = authAPIService.getCurrentUser();
  let currentView = 'map';
  let map = null;
  let heatLayer = null;       // leaflet.heat layer
  let heatVisible = true;     // toggle state
  let touristMarkers = {};
  let selectedState = 'all';
  let selectedCity = 'all';
  let cachedUsers = []; // Cache users from API
  let analyticsData = null; // Cache analytics data

  setTimeout(() => {
    initializeSocketIO();
    initializeMap();
    setupNavigation();
    listenForIncidents();
    // setupLogout(); // Removed - now in settings view
    listenForLocationUpdates();
    listenForSOSAlerts();
    listenForSocketUpdates();
    fetchUsers(); // Fetch users on load
    fetchIncidents(); // Fetch incidents on load
    fetchAnalytics(); // Fetch analytics on load
  }, 0);
  
  async function fetchAnalytics() {
    try {
      const response = await fetch(`${API_URL}/api/analytics/overview`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        analyticsData = await response.json();
        console.log('[AuthorityDashboard] Analytics fetched:', analyticsData);
        
        // Update current view if on map or alerts
        if (currentView === 'map' || currentView === 'alerts') {
          updateMainContent(currentView);
        }
      } else {
        console.error('[AuthorityDashboard] Failed to fetch analytics:', response.status);
      }
    } catch (error) {
      console.error('[AuthorityDashboard] Error fetching analytics:', error);
    }
  }
  
  async function fetchIncidents() {
    try {
      await incidentService.fetchIncidents();
      console.log('[AuthorityDashboard] Incidents fetched from API');
      
      // Update current view if on map or alerts view
      if (currentView === 'map' || currentView === 'alerts') {
        updateMainContent(currentView);
      }
    } catch (error) {
      console.error('[AuthorityDashboard] Error fetching incidents:', error);
    }
  }
  
  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        cachedUsers = data.users || [];
        console.log('[AuthorityDashboard] Users fetched from API:', cachedUsers.length);
        console.log('[AuthorityDashboard] User details:', cachedUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
        
        // Update map if on map view
        if (currentView === 'map') {
          initializeMap();
        }
      } else {
        console.error('[AuthorityDashboard] Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('[AuthorityDashboard] Error fetching users:', error);
    }
  }
  
  function initializeSocketIO() {
    import('../services/socket.js').then(({ socketService }) => {
      socketService.connect();
      console.log('[AuthorityDashboard] Socket.IO initialized');
    }).catch(err => {
      console.warn('[AuthorityDashboard] Socket.IO not available:', err);
    });
  }
  
  function listenForSocketUpdates() {
    // Listen for Socket.IO location updates
    window.addEventListener('socketLocationUpdate', (e) => {
      const { userId, location, active } = e.detail;
      console.log('[Socket] Location update received:', userId, location, 'active:', active);
      updateTouristMarkerRealtime(userId, location, active);
      
      // Update cached user data
      const userIndex = cachedUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        cachedUsers[userIndex].location_lat = location.lat;
        cachedUsers[userIndex].location_lng = location.lng;
        cachedUsers[userIndex].location_timestamp = location.timestamp || new Date().toISOString();
        cachedUsers[userIndex].location_active = active !== undefined ? active : true;
      }
      
      // Refresh tourists view if currently displayed
      if (currentView === 'tourists') {
        updateMainContent('tourists');
      }
    });
    
    // Listen for Socket.IO location tracking stopped
    window.addEventListener('socketLocationStopped', (e) => {
      const { userId, active } = e.detail;
      console.log('[Socket] Location tracking stopped:', userId);
      
      // Update cached user data
      const userIndex = cachedUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        cachedUsers[userIndex].location_active = false;
      }
      
      // Refresh tourists view if currently displayed
      if (currentView === 'tourists') {
        updateMainContent('tourists');
      }
    });
    
    // Listen for Socket.IO SOS alerts
    window.addEventListener('socketSOSAlert', (e) => {
      const incident = e.detail;
      console.log('[Socket] SOS alert received:', incident);
      showSOSNotification(incident);
    });
    
    // Listen for Socket.IO incident updates
    window.addEventListener('socketNewIncident', (e) => {
      const incident = e.detail;
      console.log('[Socket] New incident received:', incident);
      showNotification(`New ${incident.severity} incident: ${incident.type}`, 'warning');
      if (currentView === 'map' || currentView === 'alerts') {
        updateMainContent(currentView);
      }
    });

    // Listen for inactive tourist alerts
    window.addEventListener('socketInactiveTouristAlert', (e) => {
      const alert = e.detail;
      console.log('[Socket] ⚠️ Inactive tourist alert:', alert);
      showInactiveAlert(alert);
      
      // Add marker to map if on map view
      if (currentView === 'map' && window.map) {
        addInactiveMarkerToMap(alert);
      }
      
      // Refresh view
      if (currentView === 'tourists' || currentView === 'alerts') {
        updateMainContent(currentView);
      }
    });
  }
  
  function listenForLocationUpdates() {
    window.addEventListener('locationUpdate', (e) => {
      const { userId, location } = e.detail;
      console.log('📍 Location update received:', userId, location);
      
      // Update map if on map view
      if (currentView === 'map') {
        updateTouristMarker(userId, location);
      }
    });
  }
  
  function listenForSOSAlerts() {
    window.addEventListener('sosAlert', (e) => {
      const incident = e.detail;
      console.log('🚨 SOS Alert received:', incident);
      
      // Show urgent notification
      showSOSNotification(incident);
      
      // Update map and alerts
      if (currentView === 'map' || currentView === 'alerts') {
        updateMainContent(currentView);
      }
    });
  }
  
  function showSOSNotification(incident) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 40px rgba(239, 68, 68, 0.4);
      z-index: 10000;
      min-width: 300px;
      animation: sosSlideIn 0.3s ease, sosPulse 1s ease-in-out infinite;
      border: 3px solid white;
    `;
    
    const users = cachedUsers; // Use cached users from API
    const tourist = users.find(u => u.id === incident.userId);
    
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 1rem;">
        <div style="font-size: 2rem;">🚨</div>
        <div style="flex: 1;">
          <div style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem;">
            EMERGENCY SOS ALERT
          </div>
          <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">
            <strong>${tourist ? tourist.name : 'Tourist'}</strong>
          </div>
          <div style="font-size: 0.85rem; opacity: 0.9;">
            ${incident.location ? `📍 ${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}` : 'Location unavailable'}
          </div>
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button onclick="window.respondToSOS('${incident.id}')" style="flex: 1; padding: 0.5rem; background: white; color: #ef4444; border: none; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">
              RESPOND
            </button>
            <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
              ×
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes sosSlideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes sosPulse {
        0%, 100% { box-shadow: 0 10px 40px rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 10px 60px rgba(239, 68, 68, 0.8); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'fadeOut 0.5s ease';
        setTimeout(() => notification.remove(), 500);
      }
    }, 30000);
  }
  
  window.respondToSOS = function(incidentId) {
    // Close notification
    document.querySelectorAll('[style*="EMERGENCY SOS"]').forEach(el => {
      const parent = el.closest('[style*="position: fixed"]');
      if (parent) parent.remove();
    });
    
    // Navigate to alerts and start progress
    currentView = 'alerts';
    updateMainContent('alerts');
    
    // Auto-start progress on the SOS incident
    setTimeout(() => {
      const btn = document.querySelector(`[data-id="${incidentId}"].start-progress-btn`);
      if (btn) {
        btn.click();
      }
    }, 500);
  };
  
  function updateTouristMarker(userId, location) {
    // This would update the marker on the map in real-time
    // For now, we'll just log it and refresh the map
    console.log('Updating marker for tourist:', userId);
    initializeMap();
  }
  
  function updateTouristMarkerRealtime(userId, location, active = true) {
    if (!map) {
      console.warn('[AuthorityDashboard] Map not initialized');
      return;
    }
    
    // Update or create marker
    if (touristMarkers[userId]) {
      // Update existing marker
      touristMarkers[userId].setLatLng([location.lat, location.lng]);
      console.log('[AuthorityDashboard] Updated marker for tourist:', userId);
    } else {
      // Create new marker
      const users = cachedUsers; // Use cached users from API
      const tourist = users.find(u => u.id === userId);
      
      if (tourist) {
        const marker = L.marker([location.lat, location.lng], {
          icon: L.divIcon({
            className: 'tourist-marker',
            html: '<div style="background: #2563eb; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">👤</div>',
            iconSize: [30, 30]
          })
        }).addTo(map);
        
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <strong>${tourist.name}</strong><br>
            <small>Tourist ID: ${tourist.blockchain_id}</small><br>
            <small>Phone: ${tourist.phone}</small><br>
            <small>Last Update: ${formatTimeIST(location.timestamp || new Date())}</small><br>
            <small>Status: ${active ? '<span style="color: green;">Active</span>' : '<span style="color: gray;">Inactive</span>'}</small><br>
            <button onclick="window.viewTouristProfile('${tourist.id}')" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--primary); color: white; border: none; border-radius: 0.25rem; cursor: pointer;">View Profile</button>
          </div>
        `);
        
        touristMarkers[userId] = marker;
        console.log('[AuthorityDashboard] Created new marker for tourist:', userId);
      }
    }
  }
  
  // setupLogout function removed - now handled in settings view

  
  function showNotification(message, type = 'info') {
    import('../utils/notify.js').then(({ toast }) => toast(message, type));
  }

  function showInactiveAlert(alert) {
    // Create prominent alert banner
    const banner = document.createElement('div');
    banner.className = 'inactive-tourist-banner';
    banner.innerHTML = `
      <div class="alert-content">
        <div class="alert-icon">⚠️</div>
        <div class="alert-details">
          <strong>INACTIVE TOURIST DETECTED</strong>
          <p>${alert.userName} - No location update for ${alert.minutesInactive} minutes</p>
          <p>Last known: ${alert.lastKnownLocation.lat.toFixed(4)}, ${alert.lastKnownLocation.lng.toFixed(4)}</p>
          <p>Phone: ${alert.userPhone || 'N/A'}</p>
        </div>
        <button onclick="viewInactiveTourist(${alert.userId}, ${alert.lastKnownLocation.lat}, ${alert.lastKnownLocation.lng})" class="btn btn-warning btn-sm">
          View Location
        </button>
      </div>
    `;
    
    // Add to top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertBefore(banner, mainContent.firstChild);
      
      // Auto-remove after 3 minutes
      setTimeout(() => banner.remove(), 3 * 60 * 1000);
    }
    
    // Show toast notification
    showNotification(`⚠️ ${alert.userName} inactive for ${alert.minutesInactive} minutes!`, 'warning');
  }

  function addInactiveMarkerToMap(alert) {
    if (!window.map) return;
    
    const marker = L.marker(
      [alert.lastKnownLocation.lat, alert.lastKnownLocation.lng],
      {
        icon: L.divIcon({
          className: 'inactive-tourist-marker',
          html: '<div class="marker-icon">⚠️</div>',
          iconSize: [40, 40]
        })
      }
    ).addTo(window.map);
    
    marker.bindPopup(`
      <div class="map-popup">
        <h4>⚠️ Inactive Tourist</h4>
        <p><strong>${alert.userName}</strong></p>
        <p>Email: ${alert.userEmail}</p>
        <p>Phone: ${alert.userPhone || 'N/A'}</p>
        <p>Last update: ${new Date(alert.lastUpdateTime).toLocaleString()}</p>
        <p>Inactive for: <strong>${alert.minutesInactive} minutes</strong></p>
      </div>
    `).openPopup();
    
    // Pan to location
    window.map.setView([alert.lastKnownLocation.lat, alert.lastKnownLocation.lng], 14);
  }

  // Global function for button onclick
  window.viewInactiveTourist = function(userId, lat, lng) {
    currentView = 'map';
    updateMainContent('map');
    
    // Wait for map to load then pan to location
    setTimeout(() => {
      if (window.map) {
        window.map.setView([lat, lng], 15);
      }
    }, 500);
  };


  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        currentView = view;
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.target.classList.add('active');
        
        updateMainContent(view);
      });
    });
  }

  function handleLocationChange(stateId, cityId) {
    selectedState = stateId;
    selectedCity = cityId;
    
    console.log('[AuthorityDashboard] Location changed:', stateId, cityId);
    
    // Re-initialize map with new location
    if (currentView === 'map') {
      initializeMap();
    }
    
    // Refresh current view to apply filters
    updateMainContent(currentView);
  }

  function initializeMap() {
    // Wait for Leaflet to be available
    if (typeof L === 'undefined') {
      console.warn('[AuthorityDashboard] Leaflet not loaded yet, retrying...');
      setTimeout(initializeMap, 500);
      return;
    }
    
    const mapEl = document.getElementById('authorityMap');
    if (!mapEl) {
      console.warn('[AuthorityDashboard] Map element not found');
      return;
    }

    // Remove existing map if any
    if (map) {
      map.remove();
      map = null;
      touristMarkers = {};
    }

    try {
      // Get coordinates for selected location
      const coords = locationDataService.getLocationCoordinates(selectedState, selectedCity);
      
      // Initialize map with selected location
      map = L.map('authorityMap').setView([coords.lat, coords.lng], coords.zoom);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add tourist location markers (live tracking)
      const users = cachedUsers; // Use cached users from API
      const allTourists = users.filter(u => u.role === 'tourist');
      
      // Filter tourists by selected location
      const tourists = selectedState === 'all' 
        ? allTourists 
        : locationDataService.filterUsersByLocation(allTourists, selectedState, selectedCity);
      
      tourists.forEach(tourist => {
        if (tourist.location) {
          const marker = L.marker([tourist.location.lat, tourist.location.lng], {
            icon: L.divIcon({
              className: 'tourist-marker',
              html: '<div style="background: #2563eb; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">👤</div>',
              iconSize: [30, 30]
            })
          }).addTo(map);
          
          marker.bindPopup(`
            <div class="map-popup">
              <div class="map-popup-title">👤 ${tourist.name}</div>
              <div class="map-popup-row"><i class="fa-solid fa-id-badge" style="color:var(--primary);width:14px;"></i> ${tourist.blockchainId || 'N/A'}</div>
              <div class="map-popup-row"><i class="fa-solid fa-phone" style="color:var(--success);width:14px;"></i> ${tourist.phone || 'N/A'}</div>
              <div class="map-popup-row"><i class="fa-solid fa-clock" style="color:var(--text-muted);width:14px;"></i> ${tourist.location.timestamp ? formatTimeIST(tourist.location.timestamp) : 'N/A'}</div>
              <button class="map-popup-btn" onclick="window.viewTouristProfile('${tourist.id}')">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Profile
              </button>
            </div>
          `);
          
          // Store marker reference
          touristMarkers[tourist.id] = marker;
        }
      });

      // Add incident markers - Show ALL incidents (new, in-progress, open)
      const incidents = incidentService.getIncidents();
      console.log('[AuthorityDashboard] Incidents for map:', incidents.length);
      incidents.forEach(inc => {
        if (inc.location_lat && inc.location_lng) {
          const color = inc.severity === 'critical' ? '#ef4444' : inc.severity === 'high' ? '#f59e0b' : '#fbbf24';
          L.circleMarker([inc.location_lat, inc.location_lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            radius: 12,
            weight: 2
          }).addTo(map).bindPopup(`
            <div class="map-popup">
              <div class="map-popup-title" style="color:${color};">⚠️ ${inc.type.toUpperCase()}</div>
              <div class="map-popup-row"><i class="fa-solid fa-triangle-exclamation" style="color:${color};width:14px;"></i> Severity: ${inc.severity}</div>
              <div class="map-popup-row"><i class="fa-solid fa-align-left" style="color:var(--text-muted);width:14px;"></i> ${inc.description}</div>
              <div class="map-popup-row"><i class="fa-solid fa-clock" style="color:var(--text-muted);width:14px;"></i> ${formatToIST(inc.created_at)}</div>
            </div>
          `);
        }
      });

      // Add risk zones
      const riskZones = JSON.parse(localStorage.getItem('riskZones') || '[]');
      
      riskZones.forEach(zone => {
        const color = zone.risk === 'critical' ? '#ef4444' : zone.risk === 'high' ? '#f59e0b' : zone.risk === 'medium' ? '#fbbf24' : '#10b981';
        L.circle([zone.lat, zone.lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          radius: zone.radius,
          weight: 2
        }).addTo(map).bindPopup(`
          <strong>${zone.name}</strong><br>
          Risk Level: ${zone.risk}<br>
          Radius: ${zone.radius}m
        `);
      });
      
      // Add legend
      const legend = L.control({ position: 'bottomright' });
      legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
          <div class="map-legend-title">Map Legend</div>
          <div class="map-legend-item"><span class="map-legend-dot" style="background:#4f46e5;"></span> Tourist</div>
          <div class="map-legend-item"><span class="map-legend-dot" style="background:#ef4444;"></span> Critical</div>
          <div class="map-legend-item"><span class="map-legend-dot" style="background:#f59e0b;"></span> High</div>
          <div class="map-legend-item"><span class="map-legend-dot" style="background:#fbbf24;"></span> Medium</div>
          <div class="map-legend-item"><span class="map-legend-dot" style="background:#10b981;"></span> Safe Zone</div>
        `;
        return div;
      };
      legend.addTo(map);
      
      console.log('[AuthorityDashboard] Map initialized successfully with', tourists.length, 'tourists');
      
      // Build heatmap overlay from incidents
      buildHeatmap();
      
    } catch (error) {
      console.error('[AuthorityDashboard] Map initialization error:', error);
    }
  }

  // Severity → heatmap intensity weight
  const SEVERITY_WEIGHT = { critical: 1.0, high: 0.75, medium: 0.5, low: 0.25 };

  function buildHeatmap() {
    if (!map) return;

    // Check plugin is loaded
    if (typeof L.heatLayer === 'undefined') {
      console.warn('[Heatmap] leaflet.heat not loaded — skipping heatmap');
      return;
    }

    // Remove existing layer
    if (heatLayer) {
      map.removeLayer(heatLayer);
      heatLayer = null;
    }

    const incidents = incidentService.getIncidents();

    // Build [lat, lng, intensity] points
    const points = incidents
      .filter(inc => inc.location_lat && inc.location_lng)
      .map(inc => [
        parseFloat(inc.location_lat),
        parseFloat(inc.location_lng),
        SEVERITY_WEIGHT[inc.severity] ?? 0.5
      ]);

    if (points.length === 0) {
      console.log('[Heatmap] No incident points to render');
      return;
    }

    heatLayer = L.heatLayer(points, {
      radius: 35,        // px radius of each point
      blur: 25,          // blur amount
      maxZoom: 17,       // stop blending at this zoom
      max: 1.0,          // max intensity value
      gradient: {        // red = danger, yellow = moderate
        0.2: '#ffffb2',
        0.4: '#fecc5c',
        0.6: '#fd8d3c',
        0.8: '#f03b20',
        1.0: '#bd0026'
      }
    }).addTo(map);

    console.log(`[Heatmap] Rendered ${points.length} incident points`);
  }

  function toggleHeatmap() {
    if (!map || !heatLayer) return;

    if (heatVisible) {
      map.removeLayer(heatLayer);
      heatVisible = false;
    } else {
      heatLayer.addTo(map);
      heatVisible = true;
    }

    // Update button label
    const btn = document.getElementById('heatmapToggleBtn');
    if (btn) {
      btn.textContent = heatVisible ? '🌡️ Hide Heatmap' : '🌡️ Show Heatmap';
    }
  }

  // Expose toggle to inline onclick
  window.toggleHeatmap = toggleHeatmap;

  function listenForIncidents() {
    window.addEventListener('newIncident', async (e) => {
      const incident = e.detail;
      showNotification(`New ${incident.severity} incident: ${incident.type}`, incident.severity === 'critical' ? 'error' : 'warning');
      await fetchIncidents(); // Refresh incidents from API
      updateMainContent(currentView);
    });
  }

  function updateMainContent(view) {
    const content = document.getElementById('mainContent');
    
    if (view === 'map') {
      content.innerHTML = getMapView();
      initializeMap();
      setupLocationFilterHandlers(handleLocationChange, handleLocationChange);
    } else if (view === 'alerts') {
      content.innerHTML = getAlertsView();
      setupAlertHandlers();
      setupLocationFilterHandlers(handleLocationChange, handleLocationChange);
    } else if (view === 'tourists') {
      content.innerHTML = getTouristsView();
    } else if (view === 'analytics') {
      content.innerHTML = getAnalyticsView();
      setupLocationFilterHandlers(handleLocationChange, handleLocationChange);
    } else if (view === 'settings') {
      content.innerHTML = getSettingsView();
      setupSettingsHandlers();
    }
    }

    // Wire demo button on every view render
    setTimeout(() => {
      document.getElementById('run-demo-mode')?.addEventListener('click', runDemoScenario);
    }, 50);
  }

  // ── KPI strip shown at top of every view ──────────────────────────────────
  function _kpiStrip(incidents, users) {
    const tourists      = users.filter(u => u.role === 'tourist');
    const activeTracking = tourists.filter(t => t.location_active).length;
    const unresolved    = incidents.filter(i => i.status !== 'resolved').length;
    const { topCity }   = buildHotspotTrends(incidents);

    // Avg response time: resolved incidents with updated_at vs created_at
    const resolved = incidents.filter(i => i.status === 'resolved' && i.updated_at && i.created_at);
    const avgMins  = resolved.length
      ? Math.round(resolved.reduce((sum, i) => sum + (new Date(i.updated_at) - new Date(i.created_at)) / 60000, 0) / resolved.length)
      : null;

    const kpis = [
      { icon: '👥', label: 'Active Tourists',    value: activeTracking,                  color: 'var(--primary)' },
      { icon: '🔴', label: 'Unresolved',          value: unresolved,                      color: unresolved > 0 ? 'var(--danger)' : 'var(--success)' },
      { icon: '🏙️', label: 'Top Hotspot',         value: topCity ? topCity[0] : '—',      color: 'var(--warning)' },
      { icon: '⏱️', label: 'Avg Response',        value: avgMins != null ? avgMins + 'm' : '—', color: 'var(--text-light)' },
    ];

    return `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;
                  background:var(--card);border-radius:.75rem;margin-bottom:1rem;
                  border:1px solid var(--border);flex-wrap:wrap;">
        <span style="font-size:.7rem;font-weight:700;color:var(--text-light);letter-spacing:.08em;white-space:nowrap;">
          COMMAND CENTER
        </span>
        <div style="flex:1;display:flex;gap:1.5rem;flex-wrap:wrap;">
          ${kpis.map(k => `
            <div style="display:flex;align-items:center;gap:.4rem;">
              <span>${k.icon}</span>
              <span style="font-size:.8rem;color:var(--text-light);">${k.label}:</span>
              <span style="font-size:.85rem;font-weight:700;color:${k.color};">${k.value}</span>
            </div>`).join('')}
        </div>
        <button id="run-demo-mode" style="
          padding:.4rem .9rem;border-radius:2rem;border:none;
          background:linear-gradient(135deg,#7c3aed,#2563eb);
          color:#fff;font-size:.8rem;cursor:pointer;white-space:nowrap;
          box-shadow:0 2px 8px rgba(124,58,237,.35);">
          🎭 Run Demo
        </button>
      </div>`;
  }

  function getMapView() {
    const allIncidents = incidentService.getIncidents();
    console.log('[AuthorityDashboard] All incidents:', allIncidents.length);
    
    // Show all active incidents (new, in-progress) - exclude only resolved
    const incidents = allIncidents.filter(i => i.status !== 'resolved');
    console.log('[AuthorityDashboard] Active incidents:', incidents.length);
    
    // Use analytics data if available, otherwise calculate from incidents
    let critical, high, total, sos;
    if (analyticsData && analyticsData.incidents) {
      critical = parseInt(analyticsData.incidents.critical_count) || 0;
      high = parseInt(analyticsData.incidents.high_count) || 0;
      total = parseInt(analyticsData.incidents.total_incidents) || 0;
      sos = parseInt(analyticsData.incidents.sos_count) || 0;
    } else {
      critical = incidents.filter(i => i.severity === 'critical').length;
      high = incidents.filter(i => i.severity === 'high').length;
      total = incidents.length;
      sos = incidents.filter(i => i.type === 'sos').length;
    }

    return `
      ${_kpiStrip(incidents, cachedUsers)}

      <div class="command-layout">
        <!-- Left: Map panel (70%) -->
        <div>
          <div class="map-panel">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-bottom:1px solid var(--border);">
              <span style="font-size:.85rem;font-weight:700;color:var(--text);">🗺️ ${i18n.t('live_map')}</span>
              <div style="display:flex;gap:.5rem;align-items:center;">
                <button id="heatmapToggleBtn" onclick="toggleHeatmap()" class="btn btn-sm btn-primary">🌡️ Heatmap</button>
                ${createLocationFilter({ selectedState, selectedCity, inline: true, showLabel: false })}
              </div>
            </div>
            <div id="authorityMap" class="map-container" style="height:500px;border-radius:0;"></div>
          </div>

          <!-- Analytics band below map -->
          <div class="analytics-band" style="border-radius:0 0 var(--r-lg) var(--r-lg);border:1px solid var(--border);border-top:none;">
            <div class="analytics-band-item">
              <div class="band-value" style="color:var(--danger);">${critical}</div>
              <div class="band-label">Critical</div>
            </div>
            <div class="analytics-band-item">
              <div class="band-value" style="color:var(--warning);">${high}</div>
              <div class="band-label">High</div>
            </div>
            <div class="analytics-band-item">
              <div class="band-value" style="color:var(--primary);">${total}</div>
              <div class="band-label">Total</div>
            </div>
            <div class="analytics-band-item">
              <div class="band-value" style="color:var(--danger);">${sos}</div>
              <div class="band-label">SOS</div>
            </div>
          </div>
        </div>

        <!-- Right: Alert rail (30%) -->
        <div>
          <div class="card" style="margin-bottom:0;">
            <div class="card-header" style="padding:.75rem 1rem;">
              <span class="card-title" style="font-size:.82rem;">🚨 Live Alerts</span>
              <span class="badge badge-danger">${incidents.filter(i => i.status !== 'resolved').length}</span>
            </div>
            <div class="alert-rail" style="padding:.75rem;">
              ${incidents.length === 0 ? `
                <div class="empty-state" style="padding:2rem 1rem;">
                  <div class="empty-state-icon">✅</div>
                  <div class="empty-state-title">All clear</div>
                  <div class="empty-state-desc">No active incidents</div>
                </div>` :
                incidents.slice(0, 20).map(inc => {
                  const userName = inc.user_name || 'Unknown Tourist';
                  const location = inc.city || inc.state || 'Unknown Location';
                  const timestamp = inc.created_at ? formatTimeIST(inc.created_at) : 'Just now';
                  const coords = inc.location_lat && inc.location_lng 
                    ? `${inc.location_lat.toFixed(4)}, ${inc.location_lng.toFixed(4)}`
                    : '';
                  
                  return `
                  <div class="alert-rail-item ${inc.severity === 'critical' ? 'critical' : inc.severity === 'high' ? 'high' : ''} ${inc.status === 'resolved' ? 'resolved' : ''}">
                    <div class="rail-type">${inc.type.toUpperCase()} · ${inc.severity.toUpperCase()}</div>
                    <div class="rail-meta">
                      <strong>${userName}</strong><br>
                      📍 ${location}${coords ? ` (${coords})` : ''}<br>
                      🕐 ${timestamp}
                    </div>
                    ${inc.dispatchSuggestions?.length ? `
                      <div class="rail-dispatch">🤖 ${inc.dispatchSuggestions[0]}</div>` : ''}
                    ${inc.status !== 'resolved' ? `
                      <div style="margin-top:.5rem;display:flex;gap:.3rem;">
                        <button class="btn btn-sm btn-success start-progress-btn" data-id="${inc.id}" style="flex:1;font-size:.7rem;padding:.3rem .5rem;">
                          ${inc.status === 'new' ? '▶ Start' : '✓ Resolve'}
                        </button>
                      </div>` : ''}
                  </div>`;
                }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getAlertsView() {
    const allIncidents = incidentService.getIncidents();
    console.log('[AuthorityDashboard] All incidents for alerts:', allIncidents.length);
    console.log('[AuthorityDashboard] Incident sample:', allIncidents[0]);
    
    // Filter by location if selected
    let incidents = allIncidents;
    if (selectedState !== 'all') {
      const users = cachedUsers; // Use cached users from API
      const filteredUsers = locationDataService.filterUsersByLocation(users, selectedState, selectedCity);
      incidents = allIncidents.filter(inc => 
        filteredUsers.some(u => u.id === inc.user_id)
      );
    }

    return `
      ${_kpiStrip(incidents, cachedUsers)}
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🚨 ${i18n.t('real_time_feed')}</h3>
          <button class="btn btn-primary" onclick="location.reload()">${i18n.t('refresh')}</button>
        </div>
        
        ${createLocationFilter({
          selectedState,
          selectedCity,
          inline: true,
          showLabel: true
        })}
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
            <thead>
              <tr style="background: var(--bg); border-bottom: 2px solid var(--border);">
                <th style="padding: 0.75rem; text-align: left;">Incident ID</th>
                <th style="padding: 0.75rem; text-align: left;">Type</th>
                <th style="padding: 0.75rem; text-align: left;">Severity</th>
                <th style="padding: 0.75rem; text-align: left;">Status</th>
                <th style="padding: 0.75rem; text-align: left;">Tourist Name</th>
                <th style="padding: 0.75rem; text-align: left;">Timestamp</th>
                <th style="padding: 0.75rem; text-align: left;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${incidents.length > 0 ? incidents.map(inc => `
                <tr style="border-bottom: 1px solid var(--border); ${inc.severity === 'critical' ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                  <td style="padding: 0.75rem;">
                    <code style="font-size: 0.85rem;">${inc.id.substring(0, 8)}...</code>
                  </td>
                  <td style="padding: 0.75rem;">
                    <strong>${inc.type.toUpperCase()}</strong>
                  </td>
                  <td style="padding: 0.75rem;">
                    <span class="badge badge-${inc.status === 'new' ? 'danger' : inc.status === 'in-progress' ? 'warning' : 'success'}" style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; background: ${
                      inc.severity === 'critical' ? '#ef4444' : 
                      inc.severity === 'high' ? '#f59e0b' : 
                      inc.severity === 'medium' ? '#fbbf24' : '#10b981'
                    }; color: white;">
                      ${inc.severity}
                    </span>
                  </td>
                  <td style="padding: 0.75rem;">
                    <span class="badge badge-${inc.status === 'new' ? 'danger' : inc.status === 'in-progress' ? 'warning' : 'success'}" style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem;">
                      ${inc.status.toUpperCase().replace('-', ' ')}
                    </span>
                  </td>
                  <td style="padding: 0.75rem;">${inc.user_name || 'Unknown'}</td>
                  <td style="padding: 0.75rem;">
                    <small>${formatToIST(inc.created_at)}</small>
                  </td>
                  <td style="padding: 0.75rem;">
                    <div style="display: flex; gap: 0.5rem;">
                      ${inc.status === 'new' ? `
                        <button class="btn btn-success start-progress-btn" data-id="${inc.id}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                          ${i18n.t('start_progress')}
                        </button>
                      ` : ''}
                      ${inc.status === 'in-progress' ? `
                        <button class="btn btn-primary resolve-btn" data-id="${inc.id}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                          ${i18n.t('resolve')}
                        </button>
                      ` : ''}
                      ${inc.status === 'resolved' ? `
                        <span style="color: var(--success); font-weight: bold;">✓ ${i18n.t('resolved')}</span>
                      ` : ''}
                    </div>
                    ${inc.dispatchSuggestions?.length ? `
                      <div style="margin-top:.5rem;font-size:.75rem;color:var(--text-light);">
                        <div style="font-weight:600;margin-bottom:.2rem;">🚔 Suggested:</div>
                        ${inc.dispatchSuggestions.map(s => `<div>${s}</div>`).join('')}
                      </div>` : ''}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-light);">
                    ${i18n.t('no_data')}
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function getTouristsView() {
    const users = cachedUsers // Use cached users from API
      .filter(u => u.role === 'tourist');

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">👥 Registered Tourists</h3>
          <div>
            <span style="color: var(--text-light);">Total: ${users.length}</span>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; padding: 1rem 0;">
          ${users.length > 0 ? users.map(u => `
            <div class="tourist-card" style="background: var(--bg); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s;" onclick="window.viewTouristProfile('${u.id}')">
              <div style="display: flex; align-items: start; gap: 1rem;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; flex-shrink: 0;">
                  👤
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">${u.name}</h4>
                  <p style="margin: 0; font-size: 0.85rem; color: var(--text-light); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong>ID:</strong> ${u.blockchainId}
                  </p>
                  <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-light);">
                    <strong>Phone:</strong> ${u.phone}
                  </p>
                  <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center;">
                    <span style="background: var(--success); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                      ✓ Verified
                    </span>
                    ${u.location_active ? '<span style="color: var(--success); font-size: 0.85rem;">📍 Location Active</span>' : '<span style="color: var(--text-light); font-size: 0.85rem;">📍 Location Inactive</span>'}
                  </div>
                </div>
              </div>
              <button class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 0.5rem;" onclick="event.stopPropagation(); window.viewTouristProfile('${u.id}')">
                View Profile
              </button>
            </div>
          `).join('') : `<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-light);">No tourists registered</p>`}
        </div>
      </div>
    `;
  }
  
  // Global function to view tourist profile
  window.viewTouristProfile = function(userId) {
    const users = cachedUsers; // Use cached users from API
    const tourist = users.find(u => u.id === userId);
    
    if (!tourist) {
      alert('Tourist not found');
      return;
    }
    
    const incidents = incidentService.getIncidents({ userId: userId });
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
    const activeIncidents = incidents.filter(i => i.status !== 'resolved').length;
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'touristProfileModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
      <div style="background: var(--card); border-radius: 1rem; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg);">
        <div style="padding: 2rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0;">👤 Tourist Profile</h2>
          <button onclick="document.getElementById('touristProfileModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-light);">×</button>
        </div>
        
        <div style="padding: 2rem;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 3rem; color: white; margin-bottom: 1rem;">
              👤
            </div>
            <h3 style="margin: 0.5rem 0;">${tourist.name}</h3>
            <span style="background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem;">
              ✓ Verified
            </span>
          </div>
          
          <div style="background: var(--bg); padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 1rem 0;">Personal Information</h4>
            <div style="display: grid; gap: 0.75rem;">
              <div>
                <strong>Email:</strong><br>
                <span style="color: var(--text-light);">${tourist.email}</span>
              </div>
              <div>
                <strong>Phone:</strong><br>
                <span style="color: var(--text-light);">${tourist.phone}</span>
              </div>
              <div>
                <strong>Emergency Contact:</strong><br>
                <span style="color: var(--text-light);">${tourist.emergencyContact}</span>
              </div>
              <div>
                <strong>Blockchain ID:</strong><br>
                <code style="background: var(--card); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem;">${tourist.blockchainId}</code>
              </div>
              <div>
                <strong>Registered:</strong><br>
                <span style="color: var(--text-light);">${formatToIST(tourist.createdAt)}</span>
              </div>
            </div>
          </div>
          
          <div style="background: var(--bg); padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 1rem 0;">Incident Statistics</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
              <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${incidents.length}</div>
                <div style="font-size: 0.85rem; color: var(--text-light);">Total</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--warning);">${activeIncidents}</div>
                <div style="font-size: 0.85rem; color: var(--text-light);">Active</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${resolvedIncidents}</div>
                <div style="font-size: 0.85rem; color: var(--text-light);">Resolved</div>
              </div>
            </div>
          </div>
          
          ${tourist.location ? `
            <div style="background: var(--bg); padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem;">
              <h4 style="margin: 0 0 1rem 0;">📍 Current Location</h4>
              <p style="margin: 0; color: var(--text-light);">
                Latitude: ${tourist.location.lat.toFixed(6)}<br>
                Longitude: ${tourist.location.lng.toFixed(6)}
              </p>
            </div>
          ` : ''}
          
          <div style="background: var(--bg); padding: 1.5rem; border-radius: 0.75rem;">
            <h4 style="margin: 0 0 1rem 0;">Recent Incidents</h4>
            ${incidents.length > 0 ? incidents.slice(0, 3).map(inc => `
              <div style="padding: 0.75rem; background: var(--card); border-radius: 0.5rem; margin-bottom: 0.5rem; border-left: 3px solid ${inc.severity === 'critical' ? 'var(--danger)' : inc.severity === 'high' ? 'var(--warning)' : 'var(--primary)'};">
                <strong>${inc.type.toUpperCase()}</strong> - ${inc.severity}<br>
                <small style="color: var(--text-light);">${formatToIST(inc.created_at)}</small><br>
                <span style="background: ${inc.status === 'resolved' ? 'var(--success)' : inc.status === 'in-progress' ? 'var(--warning)' : 'var(--danger)'}; color: white; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-top: 0.25rem; display: inline-block;">
                  ${inc.status.toUpperCase().replace('-', ' ')}
                </span>
              </div>
            `).join('') : '<p style="color: var(--text-light); text-align: center;">No incidents reported</p>'}
          </div>
          
          <div style="margin-top: 1.5rem;">
            <button onclick="document.getElementById('touristProfileModal').remove()" style="width: 100%; padding: 0.75rem; background: var(--text-light); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  function getAnalyticsView() {
    const allIncidents = incidentService.getIncidents();
    console.log('[AuthorityDashboard] All incidents for analytics:', allIncidents.length);
    
    // Filter incidents by location if selected
    let incidents = allIncidents;
    if (selectedState !== 'all') {
      const users = cachedUsers; // Use cached users from API
      const filteredUsers = locationDataService.filterUsersByLocation(users, selectedState, selectedCity);
      incidents = allIncidents.filter(inc => 
        filteredUsers.some(u => u.id === inc.user_id)
      );
    }
    
    const byType = {};
    const bySeverity = {};
    const byStatus = {};
    
    incidents.forEach(inc => {
      byType[inc.type] = (byType[inc.type] || 0) + 1;
      bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
      byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
    });
    
    const users = cachedUsers; // Use cached users from API
    const allTourists = users.filter(u => u.role === 'tourist');
    
    // Filter tourists by location
    const tourists = selectedState === 'all' 
      ? allTourists 
      : locationDataService.filterUsersByLocation(allTourists, selectedState, selectedCity);
    
    const touristsWithLocation = tourists.filter(t => t.location).length;
    
    // Calculate response time (mock data)
    const avgResponseTime = incidents.length > 0 ? Math.floor(Math.random() * 15) + 5 : 0;
    
    // Get incidents by day (last 7 days)
    const last7Days = [];
    const incidentsByDay = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      last7Days.push(dateStr);
      incidentsByDay[dateStr] = 0;
    }
    
    incidents.forEach(inc => {
      const incDate = new Date(inc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (incidentsByDay.hasOwnProperty(incDate)) {
        incidentsByDay[incDate]++;
      }
    });
    
    const maxIncidents = Math.max(...Object.values(incidentsByDay), 1);

    return `
      ${_kpiStrip(incidents, cachedUsers)}
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 Analytics Dashboard</h3>
        </div>
        
        ${createLocationFilter({
          selectedState,
          selectedCity,
          inline: true,
          showLabel: true
        })}
      </div>
      
      <div class="stats-grid">
        <div class="stat-card" style="border-left: 4px solid var(--primary);">
          <div class="stat-value">${incidents.length}</div>
          <div class="stat-label">Total Incidents</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--success);">
          <div class="stat-value">${incidents.filter(i => i.status === 'resolved').length}</div>
          <div class="stat-label">Resolved</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--warning);">
          <div class="stat-value">${incidents.filter(i => i.status !== 'resolved').length}</div>
          <div class="stat-label">Pending</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--danger);">
          <div class="stat-value">${avgResponseTime} min</div>
          <div class="stat-label">Avg Response Time</div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Incidents Over Time (Last 7 Days)</h3>
          </div>
          
          <div style="padding: 1rem;">
            <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 200px; gap: 0.5rem;">
              ${last7Days.map(day => {
                const count = incidentsByDay[day];
                const height = (count / maxIncidents) * 100;
                return `
                  <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 0.85rem; font-weight: bold; color: var(--primary);">${count}</div>
                    <div style="width: 100%; background: var(--primary); border-radius: 0.25rem 0.25rem 0 0; height: ${height}%; min-height: ${count > 0 ? '20px' : '2px'}; transition: height 0.3s;"></div>
                    <div style="font-size: 0.75rem; color: var(--text-light); text-align: center; white-space: nowrap;">${day}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Incident Distribution by Type</h3>
          </div>
          
          <div style="padding: 1rem;">
            ${Object.keys(byType).length > 0 ? Object.entries(byType).map(([type, count]) => {
              const percentage = (count / incidents.length * 100).toFixed(1);
              const colors = {
                'theft': '#ef4444',
                'harassment': '#f59e0b',
                'medical': '#10b981',
                'lost': '#3b82f6',
                'sos': '#dc2626',
                'other': '#6b7280'
              };
              const color = colors[type] || '#6b7280';
              
              return `
                <div style="margin-bottom: 1rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="font-weight: 500; text-transform: capitalize;">${type}</span>
                    <span style="color: var(--text-light);">${count} (${percentage}%)</span>
                  </div>
                  <div style="background: var(--bg); height: 12px; border-radius: 6px; overflow: hidden;">
                    <div style="background: ${color}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                  </div>
                </div>
              `;
            }).join('') : '<p style="text-align: center; color: var(--text-light);">No data available</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Severity Distribution</h3>
          </div>
          
          <div style="padding: 1rem;">
            <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 200px;">
              ${['low', 'medium', 'high', 'critical'].map(severity => {
                const count = bySeverity[severity] || 0;
                const maxCount = Math.max(...Object.values(bySeverity), 1);
                const height = (count / maxCount) * 100;
                const colors = {
                  'low': '#10b981',
                  'medium': '#fbbf24',
                  'high': '#f59e0b',
                  'critical': '#ef4444'
                };
                
                return `
                  <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 1.25rem; font-weight: bold; color: ${colors[severity]};">${count}</div>
                    <div style="width: 80%; background: ${colors[severity]}; border-radius: 0.25rem 0.25rem 0 0; height: ${height}%; min-height: ${count > 0 ? '30px' : '5px'};"></div>
                    <div style="font-size: 0.85rem; color: var(--text-light); text-transform: capitalize;">${severity}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Status Overview</h3>
          </div>
          
          <div style="padding: 1rem;">
            <div style="display: flex; justify-content: center; align-items: center; height: 200px; position: relative;">
              ${Object.keys(byStatus).length > 0 ? `
                <div style="width: 180px; height: 180px; border-radius: 50%; background: conic-gradient(
                  ${Object.entries(byStatus).map(([status, count], index) => {
                    const colors = {
                      'new': '#ef4444',
                      'in-progress': '#f59e0b',
                      'resolved': '#10b981'
                    };
                    const percentage = (count / incidents.length * 100);
                    const prevPercentage = Object.entries(byStatus).slice(0, index).reduce((sum, [, c]) => sum + (c / incidents.length * 100), 0);
                    return `${colors[status] || '#6b7280'} ${prevPercentage}% ${prevPercentage + percentage}%`;
                  }).join(', ')}
                ); box-shadow: 0 4px 10px rgba(0,0,0,0.1);"></div>
                <div style="position: absolute; width: 100px; height: 100px; background: var(--card); border-radius: 50%;"></div>
              ` : '<p style="color: var(--text-light);">No data</p>'}
            </div>
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${Object.entries(byStatus).map(([status, count]) => {
                const colors = {
                  'new': '#ef4444',
                  'in-progress': '#f59e0b',
                  'resolved': '#10b981'
                };
                const percentage = (count / incidents.length * 100).toFixed(1);
                
                return `
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 12px; height: 12px; background: ${colors[status] || '#6b7280'}; border-radius: 2px;"></div>
                    <span style="flex: 1; text-transform: capitalize;">${status.replace('-', ' ')}</span>
                    <span style="color: var(--text-light);">${count} (${percentage}%)</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">👥 Tourist Statistics</h3>
          </div>
          
          <div style="padding: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">${tourists.length}</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Total Tourists</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: bold; color: var(--success);">${touristsWithLocation}</div>
                <div style="font-size: 0.9rem; color: var(--text-light);">Active Tracking</div>
              </div>
            </div>
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>Tracking Rate</span>
                <span style="font-weight: bold;">${tourists.length > 0 ? ((touristsWithLocation / tourists.length) * 100).toFixed(1) : 0}%</span>
              </div>
              <div style="background: var(--bg); height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="background: var(--success); height: 100%; width: ${tourists.length > 0 ? ((touristsWithLocation / tourists.length) * 100) : 0}%; transition: width 0.3s;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚡ Quick Stats</h3>
          </div>
          
          <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--bg); border-radius: 0.5rem;">
              <span>🚨 SOS Alerts</span>
              <span style="font-weight: bold; color: var(--danger);">${incidents.filter(i => i.type === 'sos').length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--bg); border-radius: 0.5rem;">
              <span>⚠️ Risk Zones</span>
              <span style="font-weight: bold; color: var(--warning);">${JSON.parse(localStorage.getItem('riskZones') || '[]').length}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--bg); border-radius: 0.5rem;">
              <span>✅ Resolution Rate</span>
              <span style="font-weight: bold; color: var(--success);">${incidents.length > 0 ? ((incidents.filter(i => i.status === 'resolved').length / incidents.length) * 100).toFixed(1) : 0}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--bg); border-radius: 0.5rem;">
              <span>📅 Today's Incidents</span>
              <span style="font-weight: bold; color: var(--primary);">${incidents.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length}</span>
            </div>
          </div>
        </div>
      </div>

      ${(() => {
        const { topCity, peakHour, nightEscalationRisk, cityTrends } = buildHotspotTrends(incidents);
        const topCities = Object.entries(cityTrends).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return `
        <div class="card" style="margin-top:1.5rem;">
          <div class="card-header">
            <h3 class="card-title">🧠 Predictive Hotspot Intelligence</h3>
          </div>
          <div style="padding:1.25rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">

            <div style="background:var(--bg);border-radius:.75rem;padding:1rem;border-left:4px solid var(--danger);">
              <div style="font-size:.75rem;color:var(--text-light);margin-bottom:.25rem;">🏙️ Top Unsafe City</div>
              <div style="font-size:1.2rem;font-weight:700;">${topCity ? topCity[0] : '—'}</div>
              <div style="font-size:.8rem;color:var(--text-light);">${topCity ? topCity[1] + ' incidents' : 'No data yet'}</div>
            </div>

            <div style="background:var(--bg);border-radius:.75rem;padding:1rem;border-left:4px solid var(--warning);">
              <div style="font-size:.75rem;color:var(--text-light);margin-bottom:.25rem;">⏰ Peak Incident Hour</div>
              <div style="font-size:1.2rem;font-weight:700;">${peakHour ? formatHour(peakHour[0]) : '—'}</div>
              <div style="font-size:.8rem;color:var(--text-light);">${peakHour ? peakHour[1] + ' incidents' : 'No data yet'}</div>
            </div>

            <div style="background:var(--bg);border-radius:.75rem;padding:1rem;border-left:4px solid ${nightEscalationRisk >= 50 ? 'var(--danger)' : 'var(--success)'};">
              <div style="font-size:.75rem;color:var(--text-light);margin-bottom:.25rem;">🌙 Night Escalation Risk</div>
              <div style="font-size:1.2rem;font-weight:700;">${nightEscalationRisk}%</div>
              <div style="font-size:.8rem;color:var(--text-light);">${nightEscalationRisk >= 50 ? '⚠️ High night activity' : '✅ Mostly daytime'}</div>
            </div>

          </div>

          ${topCities.length > 0 ? `
          <div style="padding:0 1.25rem 1.25rem;">
            <div style="font-size:.8rem;font-weight:600;color:var(--text-light);margin-bottom:.6rem;">REPEAT HOTSPOT ZONES</div>
            <div style="display:flex;flex-direction:column;gap:.4rem;">
              ${topCities.map(([city, count], i) => {
                const pct = Math.round((count / incidents.length) * 100);
                return `
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <span style="font-size:.8rem;width:1.2rem;color:var(--text-light);">${i + 1}</span>
                  <span style="font-size:.85rem;flex:1;">${city}</span>
                  <div style="width:120px;background:var(--border);border-radius:4px;height:8px;overflow:hidden;">
                    <div style="width:${pct}%;background:var(--danger);height:100%;border-radius:4px;"></div>
                  </div>
                  <span style="font-size:.8rem;color:var(--text-light);width:2rem;text-align:right;">${count}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        </div>`;
      })()}
    `;
  }

  function setupAlertHandlers() {
    // Start Progress button
    document.querySelectorAll('.start-progress-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const success = incidentService.changeStatus(id, 'in-progress', user.name);
        if (success) {
          showNotification('Incident status updated to In Progress', 'success');
          updateMainContent('alerts');
        }
      });
    });

    // Respond button - add notes
    document.querySelectorAll('.respond-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const message = prompt('Enter response message:');
        if (message) {
          incidentService.addResponse(id, {
            officer: user.name,
            message: message
          });
          showNotification('Response added successfully', 'success');
          updateMainContent('alerts');
        }
      });
    });

    // Resolve button
    document.querySelectorAll('.resolve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (confirm('Mark this incident as resolved?')) {
          const success = incidentService.changeStatus(id, 'resolved', user.name);
          if (success) {
            showNotification('Incident resolved successfully', 'success');
            updateMainContent('alerts');
          }
        }
      });
    });
  }

  function getSettingsView() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">⚙️ ${i18n.t('settings')}</h3>
        </div>
        <div class="card-body">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">🌐 ${i18n.t('language')}</div>
              <div class="setting-desc">Choose your preferred language</div>
            </div>
            <select class="form-control" id="languageSelect" style="width:auto;min-width:150px;">
              ${LANGUAGE_OPTIONS.map(l =>
                `<option value="${l.code}" ${i18n.currentLang === l.code ? 'selected' : ''}>${l.label}</option>`
              ).join('')}
            </select>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">🌙 ${i18n.t('dark_mode')}</div>
              <div class="setting-desc">Toggle dark mode theme</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="darkModeCheck" ${isDark ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">🔔 ${i18n.t('notifications')}</div>
              <div class="setting-desc">Enable desktop notifications</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="notificationsCheck" checked>
              <span class="slider"></span>
            </label>
          </div>

          <div style="margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border);">
            <button class="btn btn-danger btn-full" id="logoutBtn">
              🚪 ${i18n.t('logout')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function setupSettingsHandlers() {
    // Language selector
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value);
        showNotification('Language changed successfully', 'success');
        setTimeout(() => location.reload(), 500);
      });
    }

    // Dark mode toggle
    const darkModeCheck = document.getElementById('darkModeCheck');
    if (darkModeCheck) {
      darkModeCheck.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
        showNotification(`${e.target.checked ? 'Dark' : 'Light'} mode enabled`, 'success');
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm(i18n.t('logout_confirm'))) {
          authAPIService.logout();
        }
      });
    }
  }

  return `
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">🚔</div>
            <div><h2>Control Room</h2></div>
          </div>
        </div>

        <div class="sidebar-user">
          <div class="sidebar-avatar">${user.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.name}</div>
            <div class="sidebar-user-role">Authority</div>
          </div>
        </div>
        
        <nav>
          <div class="nav-section-label">Operations</div>
          <div class="nav-item active" data-view="map">
            <span class="nav-item-icon">🗺️</span> ${i18n.t('live_map')}
          </div>
          <div class="nav-item" data-view="alerts">
            <span class="nav-item-icon">🚨</span> ${i18n.t('alerts')}
          </div>
          <div class="nav-item" data-view="tourists">
            <span class="nav-item-icon">👥</span> ${i18n.t('tourists')}
          </div>
          <div class="nav-item" data-view="analytics">
            <span class="nav-item-icon">📊</span> ${i18n.t('analytics')}
          </div>
          <div class="nav-item" data-view="settings">
            <span class="nav-item-icon">⚙️</span> ${i18n.t('settings')}
          </div>
        </nav>
      </aside>
      
      <main class="main-content" id="mainContent">
        ${getMapView()}
      </main>
    </div>
  `;
}
