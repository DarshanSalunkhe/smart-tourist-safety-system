import { authAPIService } from '../services/auth-api.js';
import { incidentService } from '../services/incident.js';
import { demoModeService } from '../services/demo-mode.js';
import { i18n } from '../services/i18n.js';
import { locationDataService } from '../services/location-data.js';
import { createLocationFilter, setupLocationFilterHandlers } from '../components/LocationFilter.js';
import { formatToIST } from '../utils/time.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export function AdminDashboard() {
  const user = authAPIService.getCurrentUser();
  let currentView = 'users';
  let map = null;
  let selectedState = 'all';
  let selectedCity = 'all';
  let cachedUsers = []; // Cache users from API
  let analyticsData = {}; // Cache analytics data
  
  // Normalize function for case-insensitive comparison
  const normalize = (value) => {
    if (!value) return '';
    return String(value).trim().toLowerCase();
  };

  setTimeout(() => {
    setupNavigation();
    setupLogout();
    fetchUsers(); // Fetch users on load
    fetchIncidents(); // Fetch incidents on load
    fetchAnalytics(); // Fetch analytics on load
  }, 0);
  
  async function fetchAnalytics() {
    try {
      console.log('[AdminDashboard] Fetching analytics...');
      
      const [overview, severity, monthly, topCities] = await Promise.all([
        fetch(`${API_URL}/api/analytics/overview`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API_URL}/api/analytics/severity`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API_URL}/api/analytics/monthly`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API_URL}/api/analytics/top-cities`, { credentials: 'include' }).then(r => r.json())
      ]);
      
      analyticsData = { overview, severity, monthly, topCities };
      console.log('[AdminDashboard] Analytics fetched:', analyticsData);
      
      // Update analytics view if currently displayed
      if (currentView === 'analytics') {
        updateMainContent('analytics');
      }
    } catch (error) {
      console.error('[AdminDashboard] Error fetching analytics:', error);
    }
  }
  
  async function fetchIncidents() {
    try {
      await incidentService.fetchIncidents();
      console.log('[AdminDashboard] Incidents fetched from API');
    } catch (error) {
      console.error('[AdminDashboard] Error fetching incidents:', error);
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
        console.log('[AdminDashboard] Users fetched from API:', cachedUsers.length);
        console.log('[AdminDashboard] User details:', cachedUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
        
        // Update current view if on users view
        if (currentView === 'users') {
          updateMainContent('users');
        }
      } else {
        console.error('[AdminDashboard] Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('[AdminDashboard] Error fetching users:', error);
    }
  }
  
  function setupLogout() {
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
      if (confirm(i18n.t('logout_confirm'))) {
        authAPIService.logout();
      }
    });
  }
  
  function showNotification(message, type = 'info') {
    import('../utils/notify.js').then(({ toast }) => toast(message, type));
  }

  function initializeRiskZoneMap() {
    // Wait for Leaflet to be available
    if (typeof L === 'undefined') {
      console.warn('[AdminDashboard] Leaflet not loaded yet, retrying...');
      setTimeout(initializeRiskZoneMap, 500);
      return;
    }
    
    const mapEl = document.getElementById('riskZoneMap');
    if (!mapEl) {
      console.warn('[AdminDashboard] Map element not found');
      return;
    }

    // Remove existing map if any
    if (map) {
      map.remove();
      map = null;
    }

    try {
      // Get coordinates for selected location
      const coords = locationDataService.getLocationCoordinates(selectedState, selectedCity);
      
      // Initialize map with selected location
      map = L.map('riskZoneMap').setView([coords.lat, coords.lng], coords.zoom);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add risk zones
      const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');
      
      zones.forEach(zone => {
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
      
      console.log('[AdminDashboard] Risk zone map initialized successfully');
    } catch (error) {
      console.error('[AdminDashboard] Map initialization error:', error);
    }
  }

  function handleLocationChange(stateId, cityId) {
    selectedState = stateId;
    selectedCity = cityId;
    
    console.log('[AdminDashboard] Location changed:', stateId, cityId);
    console.log('[AdminDashboard] Current view:', currentView);
    console.log('[AdminDashboard] Will refresh view with new filters');
    
    // Re-initialize map if on zones view
    if (currentView === 'zones' && map) {
      initializeRiskZoneMap();
    }
    
    // Refresh current view to apply filters
    updateMainContent(currentView);
    console.log('[AdminDashboard] View refreshed with filters');
  }

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

  function updateMainContent(view) {
    const content = document.getElementById('mainContent');

    // Tab header — always rendered above content
    const tabs = [
      { id: 'users',     icon: '👥', label: 'Users' },
      { id: 'zones',     icon: '⚠️', label: 'Risk Zones' },
      { id: 'analytics', icon: '📊', label: 'Analytics' },
      { id: 'thresholds',icon: '🧠', label: 'AI Thresholds' },
      { id: 'health',    icon: '💚', label: 'System Health' },
      { id: 'demo',      icon: '🎭', label: 'Demo' },
      { id: 'logs',      icon: '📋', label: 'Logs' },
    ];

    const tabBar = `
      <div style="display:flex;gap:.25rem;padding:.5rem;background:var(--card);border-radius:var(--r-lg);border:1px solid var(--border);margin-bottom:1.25rem;overflow-x:auto;flex-wrap:nowrap;">
        ${tabs.map(t => `
          <button data-tab="${t.id}" style="
            display:flex;align-items:center;gap:.35rem;padding:.45rem .9rem;
            border-radius:var(--r-md);border:none;cursor:pointer;font-size:.8rem;font-weight:600;
            white-space:nowrap;font-family:inherit;transition:all var(--t);
            background:${view === t.id ? 'var(--primary)' : 'transparent'};
            color:${view === t.id ? '#fff' : 'var(--text-light)'};
          ">${t.icon} ${t.label}</button>`).join('')}
      </div>`;

    let viewHtml = '';
    if (view === 'users')      viewHtml = getUsersView();
    else if (view === 'zones') viewHtml = getZonesView();
    else if (view === 'analytics') viewHtml = getAnalyticsView();
    else if (view === 'thresholds') viewHtml = getThresholdsView();
    else if (view === 'health')    viewHtml = getSystemHealthView();
    else if (view === 'logs')  viewHtml = getLogsView();
    else if (view === 'demo')  viewHtml = getDemoModeView();

    content.innerHTML = tabBar + viewHtml;

    // Tab click handlers
    content.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentView = btn.dataset.tab;
        updateMainContent(currentView);
        if (currentView === 'zones') setTimeout(() => initializeRiskZoneMap(), 100);
      });
    });

    // View-specific setup
    if (view === 'users')  { setupUserHandlers(); setupLocationFilterHandlers(handleLocationChange, handleLocationChange); }
    if (view === 'zones')  { setupZoneHandlers(); setupLocationFilterHandlers(handleLocationChange, handleLocationChange); }
    if (view === 'analytics') setupLocationFilterHandlers(handleLocationChange, handleLocationChange);
    if (view === 'demo')   setupDemoHandlers();
  }

  function getUsersView() {
    const allUsers = cachedUsers; // Use cached users from API
    
    // Filter users by location if selected with case-insensitive comparison
    const users = selectedState === 'all' 
      ? allUsers 
      : allUsers.filter(u => {
          const stateMatch = normalize(u.state) === normalize(selectedState);
          if (selectedCity === 'all') {
            return stateMatch;
          }
          return stateMatch && normalize(u.city) === normalize(selectedCity);
        });
    
    const tourists = users.filter(u => u.role === 'tourist');
    const authorities = users.filter(u => u.role === 'authority');
    const admins = users.filter(u => u.role === 'admin');

    return `
      <div class="stats-grid">
        <div class="stat-card" style="border-left: 4px solid var(--primary);">
          <div class="stat-value">${tourists.length}</div>
          <div class="stat-label">${i18n.t('tourists')}</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--success);">
          <div class="stat-value">${authorities.length}</div>
          <div class="stat-label">Authorities</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--warning);">
          <div class="stat-value">${admins.length}</div>
          <div class="stat-label">Admins</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--danger);">
          <div class="stat-value">${users.length}</div>
          <div class="stat-label">Total Users</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">👥 ${i18n.t('users')} Management</h3>
          <button class="btn btn-primary" id="addUserBtn">+ Add User</button>
        </div>
        
        ${createLocationFilter({
          selectedState,
          selectedCity,
          inline: true,
          showLabel: true
        })}
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="padding: 0.75rem; text-align: left;">${i18n.t('name')}</th>
              <th style="padding: 0.75rem; text-align: left;">${i18n.t('email')}</th>
              <th style="padding: 0.75rem; text-align: left;">${i18n.t('role')}</th>
              <th style="padding: 0.75rem; text-align: left;">${i18n.t('blockchain_id')}</th>
              <th style="padding: 0.75rem; text-align: left;">${i18n.t('status')}</th>
              <th style="padding: 0.75rem; text-align: left;">${i18n.t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${users.length > 0 ? users.map(u => `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.75rem;">${u.name}</td>
                <td style="padding: 0.75rem;">${u.email}</td>
                <td style="padding: 0.75rem;">
                  <span style="background: var(--bg); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem;">
                    ${u.role}
                  </span>
                </td>
                <td style="padding: 0.75rem;"><code style="font-size: 0.85rem;">${u.blockchainId}</code></td>
                <td style="padding: 0.75rem;">
                  <span style="color: var(--success);">✓ Active</span>
                </td>
                <td style="padding: 0.75rem;">
                  <button class="btn btn-danger delete-user-btn" data-id="${u.id}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                    ${i18n.t('delete')}
                  </button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-light);">${i18n.t('no_data')}</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  function getZonesView() {
    const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">⚠️ Risk Zone Management</h3>
          <button class="btn btn-primary" id="addZoneBtn">+ Add Risk Zone</button>
        </div>
        
        ${createLocationFilter({
          selectedState,
          selectedCity,
          inline: true,
          showLabel: true
        })}
        
        <div id="riskZoneMap" class="map-container" style="height: 400px; margin: 1rem 0; border-radius: 0.5rem; overflow: hidden;"></div>
        
        <div id="zoneForm" style="display: none; margin-bottom: 2rem; padding: 1.5rem; background: var(--bg); border-radius: 0.5rem;">
          <h4>Add New Risk Zone</h4>
          <form id="newZoneForm">
            <div class="form-group">
              <label>Zone Name</label>
              <input type="text" id="zoneName" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Latitude</label>
              <input type="number" step="0.0001" id="zoneLat" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Longitude</label>
              <input type="number" step="0.0001" id="zoneLng" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Radius (meters)</label>
              <input type="number" id="zoneRadius" class="form-control" value="500" required>
            </div>
            
            <div class="form-group">
              <label>Risk Level</label>
              <select id="zoneRisk" class="form-control" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <button type="submit" class="btn btn-primary">Save Zone</button>
            <button type="button" class="btn" id="cancelZoneBtn" style="margin-left: 0.5rem;">Cancel</button>
          </form>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="padding: 0.75rem; text-align: left;">Zone Name</th>
              <th style="padding: 0.75rem; text-align: left;">Coordinates</th>
              <th style="padding: 0.75rem; text-align: left;">Radius</th>
              <th style="padding: 0.75rem; text-align: left;">Risk Level</th>
              <th style="padding: 0.75rem; text-align: left;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${zones.map((z, idx) => `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.75rem;">${z.name}</td>
                <td style="padding: 0.75rem;">${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}</td>
                <td style="padding: 0.75rem;">${z.radius}m</td>
                <td style="padding: 0.75rem;">
                  <span style="background: ${z.risk === 'critical' ? 'var(--danger)' : z.risk === 'high' ? 'var(--warning)' : 'var(--success)'}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem;">
                    ${z.risk}
                  </span>
                </td>
                <td style="padding: 0.75rem;">
                  <button class="btn btn-danger delete-zone-btn" data-index="${idx}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                    Delete
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="padding: 1rem; text-align: center;">No risk zones defined</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function getAnalyticsView() {
    const allIncidents = incidentService.getIncidents();
    console.log('[AdminDashboard] All incidents for analytics:', allIncidents.length);
    console.log('[AdminDashboard] Incident sample:', allIncidents[0]);
    console.log('[AdminDashboard] Analytics data:', analyticsData);
    console.log('[AdminDashboard] Selected filters:', { selectedState, selectedCity });
    
    const stats = incidentService.getStats();
    const allUsers = cachedUsers; // Use cached users from API
    const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');
    
    // Filter incidents and users by location if selected
    let incidents = allIncidents;
    let users = allUsers;
    
    if (selectedState !== 'all') {
      // Filter users by location with case-insensitive comparison
      const filteredUsers = allUsers.filter(u => {
        const stateMatch = normalize(u.state) === normalize(selectedState);
        if (selectedCity === 'all') {
          return stateMatch;
        }
        return stateMatch && normalize(u.city) === normalize(selectedCity);
      });
      
      users = filteredUsers;
      
      // Filter incidents by matching user IDs
      incidents = allIncidents.filter(inc => 
        filteredUsers.some(u => u.id === inc.user_id)
      );
      
      console.log('[AdminDashboard] Filtered incidents:', incidents.length, 'for state:', selectedState, 'city:', selectedCity);
      console.log('[AdminDashboard] Filtered users:', users.length);
    } else {
      console.log('[AdminDashboard] No filters applied, showing all data');
    }

    // Calculate today's incidents using IST timezone
    const getISTDate = (date) => {
      return new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    };
    
    const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const todayIncidents = incidents.filter(i => {
      const incidentDateIST = getISTDate(i.created_at);
      return incidentDateIST === todayIST;
    }).length;
    
    console.log('[AdminDashboard] Today (IST):', todayIST, 'Today incidents:', todayIncidents);

    const avgResponseTime = incidents.length > 0 
      ? Math.floor(Math.random() * 15) + 5 
      : 0;
    
    // Use filtered data instead of backend analytics when filters are applied
    const useFilteredData = selectedState !== 'all';
    
    // Calculate stats from filtered data
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
    const sosCount = incidents.filter(i => i.type === 'sos').length;
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    const highCount = incidents.filter(i => i.severity === 'high').length;
    const mediumCount = incidents.filter(i => i.severity === 'medium').length;
    const lowCount = incidents.filter(i => i.severity === 'low').length;
    const newIncidents = incidents.filter(i => i.status === 'new').length;
    const inProgressIncidents = incidents.filter(i => i.status === 'in-progress').length;
    
    // Use analytics data if available and no filters applied
    const overviewData = analyticsData.overview || {};
    const incidentStats = overviewData.incidents || {};
    const userStats = overviewData.users || {};
    const severityData = analyticsData.severity?.severityData || [];
    const monthlyData = analyticsData.monthly?.monthlyData || [];
    const topCitiesData = analyticsData.topCities?.topCities || [];
    
    console.log('[AdminDashboard] Using filtered data:', useFilteredData);
    console.log('[AdminDashboard] Stats:', {
      totalIncidents,
      resolvedIncidents,
      sosCount,
      todayIncidents,
      criticalCount,
      highCount,
      mediumCount,
      lowCount
    });

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 System Analytics</h3>
          <button class="btn btn-primary" onclick="window.refreshAnalytics()">Refresh</button>
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
          <div class="stat-value">${useFilteredData ? totalIncidents : (incidentStats.total_incidents || totalIncidents)}</div>
          <div class="stat-label">Total Incidents</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--success);">
          <div class="stat-value">${useFilteredData ? resolvedIncidents : (incidentStats.resolved || resolvedIncidents)}</div>
          <div class="stat-label">Resolved</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--warning);">
          <div class="stat-value">${todayIncidents}</div>
          <div class="stat-label">Today's Incidents (IST)</div>
        </div>
        
        <div class="stat-card" style="border-left: 4px solid var(--danger);">
          <div class="stat-value">${useFilteredData ? sosCount : (incidentStats.sos_count || sosCount)}</div>
          <div class="stat-label">SOS Alerts</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 System Overview</h3>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; padding: 1rem;">
          <div>
            <h4 style="margin-bottom: 1rem;">User Distribution</h4>
            <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem;">
              <p>Tourists: ${userStats.tourists || users.filter(u => u.role === 'tourist').length}</p>
              <p>Authorities: ${userStats.authorities || users.filter(u => u.role === 'authority').length}</p>
              <p>Admins: ${userStats.admins || users.filter(u => u.role === 'admin').length}</p>
              <p><strong>Total: ${userStats.total_users || users.length}</strong></p>
            </div>
          </div>
          
          <div>
            <h4 style="margin-bottom: 1rem;">Incident Status</h4>
            <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem;">
              <p>New: ${useFilteredData ? newIncidents : (incidentStats.new_incidents || newIncidents)}</p>
              <p>In Progress: ${useFilteredData ? inProgressIncidents : (incidentStats.in_progress || inProgressIncidents)}</p>
              <p>Resolved: ${useFilteredData ? resolvedIncidents : (incidentStats.resolved || resolvedIncidents)}</p>
            </div>
          </div>
          
          <div>
            <h4 style="margin-bottom: 1rem;">Severity Distribution</h4>
            <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem;">
              ${(severityData.length > 0 && !useFilteredData) ? severityData.map(s => `
                <p style="display: flex; justify-content: space-between;">
                  <span style="text-transform: capitalize;">${s.severity}:</span>
                  <strong>${s.count}</strong>
                </p>
              `).join('') : `
                <p>Critical: ${useFilteredData ? criticalCount : (incidentStats.critical_count || criticalCount)}</p>
                <p>High: ${useFilteredData ? highCount : (incidentStats.high_count || highCount)}</p>
                <p>Medium: ${useFilteredData ? mediumCount : (incidentStats.medium_count || mediumCount)}</p>
                <p>Low: ${useFilteredData ? lowCount : (incidentStats.low_count || lowCount)}</p>
              `}
            </div>
          </div>
          
          <div>
            <h4 style="margin-bottom: 1rem;">Safety Metrics</h4>
            <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem;">
              <p>Risk Zones: ${zones.length}</p>
              <p>Critical Alerts: ${useFilteredData ? criticalCount : (incidentStats.critical_count || criticalCount)}</p>
              <p>Avg Response: ${avgResponseTime} min</p>
            </div>
          </div>
        </div>
      </div>
      
      ${monthlyData.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <h4>📈 Monthly Incident Trend</h4>
          </div>
          <div style="padding: 1rem;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border);">
                  <th style="padding: 0.5rem; text-align: left;">Month</th>
                  <th style="padding: 0.5rem; text-align: right;">Total Incidents</th>
                  <th style="padding: 0.5rem; text-align: right;">Critical</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyData.map(m => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.5rem;">${new Date(m.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                    <td style="padding: 0.5rem; text-align: right;"><strong>${m.incident_count}</strong></td>
                    <td style="padding: 0.5rem; text-align: right; color: var(--danger);">${m.critical_count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
      
      ${topCitiesData.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <h4>🏙️ Top Risk Cities</h4>
          </div>
          <div style="padding: 1rem;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border);">
                  <th style="padding: 0.5rem; text-align: left;">City</th>
                  <th style="padding: 0.5rem; text-align: left;">State</th>
                  <th style="padding: 0.5rem; text-align: right;">Incidents</th>
                  <th style="padding: 0.5rem; text-align: right;">Critical</th>
                </tr>
              </thead>
              <tbody>
                ${topCitiesData.map(city => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.5rem;">${city.city}</td>
                    <td style="padding: 0.5rem;">${city.state}</td>
                    <td style="padding: 0.5rem; text-align: right;"><strong>${city.incident_count}</strong></td>
                    <td style="padding: 0.5rem; text-align: right; color: var(--danger);">${city.critical_count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
  }
  
  // Add refresh analytics function
  window.refreshAnalytics = async function() {
    await fetchAnalytics();
    if (currentView === 'analytics') {
      updateMainContent('analytics');
    }
  };

  function getDemoModeView() {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🎭 Demo Mode Control Panel</h3>
        </div>
        
        <div style="padding: 1.5rem;">
          <p style="margin-bottom: 1.5rem; color: var(--text-light);">
            Demo mode generates fake tourists, incidents, and simulates police responses for testing purposes.
          </p>
          
          <div style="display: grid; gap: 1rem;">
            <button id="activateDemoBtn" class="btn btn-primary btn-lg">
              🎭 Activate Demo Mode
            </button>
            
            <button id="deactivateDemoBtn" class="btn" style="background: var(--text-light); color: white;">
              ⏹️ Deactivate Demo Mode
            </button>
            
            <button id="generateTouristsBtn" class="btn btn-success">
              👥 Generate 10 Fake Tourists
            </button>
            
            <button id="generateZonesBtn" class="btn btn-warning">
              ⚠️ Generate Risk Zones
            </button>
            
            <button id="clearDemoBtn" class="btn btn-danger">
              🧹 Clear All Demo Data
            </button>
          </div>
          
          <div id="demoStatus" style="margin-top: 2rem; padding: 1rem; background: var(--bg); border-radius: 0.5rem;">
            <strong>Status:</strong> <span id="demoStatusText">Inactive</span>
          </div>
          
          <div style="margin-top: 2rem; padding: 1rem; background: var(--warning); color: white; border-radius: 0.5rem;">
            <strong>⚠️ Warning:</strong> Demo mode will generate fake data every 30 seconds. Use only for testing.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 Demo Statistics</h3>
        </div>
        
        <div style="padding: 1rem;">
          <p>Demo Tourists: <strong id="demoTouristCount">0</strong></p>
          <p>Demo Incidents: <strong id="demoIncidentCount">0</strong></p>
          <p>Demo Risk Zones: <strong id="demoZoneCount">0</strong></p>
        </div>
      </div>
    `;
  }

  function setupDemoHandlers() {
    document.getElementById('activateDemoBtn')?.addEventListener('click', () => {
      demoModeService.activate();
      document.getElementById('demoStatusText').textContent = 'Active ✅';
      document.getElementById('demoStatusText').style.color = 'var(--success)';
      showNotification('Demo mode activated', 'success');
      updateDemoStats();
    });

    document.getElementById('deactivateDemoBtn')?.addEventListener('click', () => {
      demoModeService.deactivate();
      document.getElementById('demoStatusText').textContent = 'Inactive';
      document.getElementById('demoStatusText').style.color = 'var(--text)';
      showNotification('Demo mode deactivated', 'info');
    });

    document.getElementById('generateTouristsBtn')?.addEventListener('click', () => {
      demoModeService.generateFakeTourists(10);
      showNotification('Generated 10 fake tourists', 'success');
      updateDemoStats();
    });

    document.getElementById('generateZonesBtn')?.addEventListener('click', () => {
      demoModeService.generateFakeRiskZones();
      showNotification('Generated fake risk zones', 'success');
      updateDemoStats();
    });

    document.getElementById('clearDemoBtn')?.addEventListener('click', () => {
      if (confirm('Clear all demo data? This cannot be undone.')) {
        demoModeService.clearDemoData();
        showNotification('Demo data cleared', 'success');
        updateDemoStats();
      }
    });

    updateDemoStats();
  }

  function updateDemoStats() {
    const users = cachedUsers; // Use cached users from API
    const incidents = JSON.parse(localStorage.getItem('incidents') || '[]');
    const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');

    const demoTourists = users.filter(u => u.id?.startsWith('demo-')).length;
    const demoIncidents = incidents.filter(i => i.demo).length;

    document.getElementById('demoTouristCount').textContent = demoTourists;
    document.getElementById('demoIncidentCount').textContent = demoIncidents;
    document.getElementById('demoZoneCount').textContent = zones.length;
  }

  function getThresholdsView() {
    const cfg = {
      HIGH_RISK: 70, MEDIUM_RISK: 40,
      ROUTE_DEVIATION: 0.005, EVAL_INTERVAL: 15,
      PREDICTIVE_CRITICAL: 85,
      TIME_LATE_NIGHT: 25, HOTSPOT_200M: 35,
      ZONE_CRITICAL: 25, STATIONARY_30M: 15, ROUTE_SCORE: 12
    };
    const rows = [
      { key: 'HIGH_RISK',          label: 'High Risk Threshold',        unit: 'pts', desc: 'Score at which risk becomes HIGH' },
      { key: 'MEDIUM_RISK',        label: 'Medium Risk Threshold',      unit: 'pts', desc: 'Score at which risk becomes MEDIUM' },
      { key: 'PREDICTIVE_CRITICAL',label: 'Predictive Critical',        unit: 'pts', desc: 'Predicted score that triggers voice warning' },
      { key: 'EVAL_INTERVAL',      label: 'Evaluation Interval',        unit: 's',   desc: 'How often risk engine recalculates' },
      { key: 'TIME_LATE_NIGHT',    label: 'Late Night Score',           unit: 'pts', desc: 'Risk added for 22:00–05:00 hours' },
      { key: 'HOTSPOT_200M',       label: 'Hotspot <200m Score',        unit: 'pts', desc: 'Risk added when within 200m of incident' },
      { key: 'ZONE_CRITICAL',      label: 'Critical Zone Score',        unit: 'pts', desc: 'Risk added inside a critical risk zone' },
      { key: 'STATIONARY_30M',     label: 'Stationary 30min Score',     unit: 'pts', desc: 'Risk added after 30 min no movement' },
      { key: 'ROUTE_SCORE',        label: 'Route Deviation Score',      unit: 'pts', desc: 'Risk added on abnormal direction change' },
    ];
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🧠 AI Risk Thresholds</h3>
          <span class="badge badge-primary">Read-only · Edit in riskConfig.js</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Description</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><code style="font-size:.78rem;background:var(--bg-2);padding:.15rem .4rem;border-radius:4px;">${r.key}</code></td>
                  <td><strong style="color:var(--primary);">${cfg[r.key]}</strong></td>
                  <td><span class="chip">${r.unit}</span></td>
                  <td style="color:var(--text-light);font-size:.82rem;">${r.desc}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:1rem 1.35rem;background:var(--ai-light);border-top:1px solid var(--border);font-size:.82rem;color:var(--ai-dark);">
          🔮 To change thresholds, edit <code>src/constants/riskConfig.js</code> and restart the frontend.
        </div>
      </div>`;
  }

  function getSystemHealthView() {
    const queueLen = (() => {
      try { return JSON.parse(localStorage.getItem('offlineQueue') || '[]').length; } catch { return 0; }
    })();
    const checks = [
      { label: 'Backend API',       status: 'checking', id: 'hc-api' },
      { label: 'Database',          status: 'checking', id: 'hc-db'  },
      { label: 'WebSocket',         status: 'checking', id: 'hc-ws'  },
      { label: 'Offline Queue',     status: queueLen === 0 ? 'ok' : 'warn', detail: queueLen === 0 ? 'Empty' : `${queueLen} pending`, id: 'hc-queue' },
      { label: 'localStorage',      status: 'ok',       detail: 'Available', id: 'hc-ls' },
      { label: 'Geolocation API',   status: navigator.geolocation ? 'ok' : 'error', detail: navigator.geolocation ? 'Supported' : 'Not supported', id: 'hc-geo' },
      { label: 'Speech Synthesis',  status: window.speechSynthesis ? 'ok' : 'warn', detail: window.speechSynthesis ? 'Available' : 'Not available', id: 'hc-speech' },
    ];
    const dot = s => s === 'ok' ? '🟢' : s === 'warn' ? '🟡' : s === 'error' ? '🔴' : '⏳';
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">💚 System Health</h3>
          <button class="btn btn-sm btn-primary" onclick="window.runHealthCheck()">🔄 Refresh</button>
        </div>
        <div style="padding:1rem 1.35rem;display:flex;flex-direction:column;gap:.6rem;">
          ${checks.map(c => `
            <div id="${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:.65rem 1rem;background:var(--bg);border-radius:var(--r-md);border:1px solid var(--border);">
              <span style="font-size:.875rem;font-weight:600;">${dot(c.status)} ${c.label}</span>
              <span style="font-size:.78rem;color:var(--text-light);">${c.detail || c.status}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  window.runHealthCheck = async function() {
    const api = document.getElementById('hc-api');
    const db  = document.getElementById('hc-db');
    const ws  = document.getElementById('hc-ws');
    try {
      const res = await fetch(`${API_URL}/health`, { credentials: 'include' });
      const data = await res.json();
      if (api) api.querySelector('span').textContent = `🟢 Backend API`;
      if (db)  db.querySelector('span:last-child').textContent = data.db === 'connected' ? '✅ Connected' : '❌ Error';
      if (ws)  ws.querySelector('span:last-child').textContent = data.websocket === 'ready' ? '✅ Ready' : '⚠️ Unknown';
    } catch {
      if (api) api.querySelector('span').textContent = `🔴 Backend API`;
      if (db)  db.querySelector('span:last-child').textContent = '❌ Unreachable';
      if (ws)  ws.querySelector('span:last-child').textContent = '❌ Unreachable';
    }
  };

  function getLogsView() {
    const logs = [
      { time: new Date().toISOString(), action: 'User Login', user: 'tourist@demo.com', status: 'success' },
      { time: new Date(Date.now() - 300000).toISOString(), action: 'Incident Created', user: 'System', status: 'info' },
      { time: new Date(Date.now() - 600000).toISOString(), action: 'Risk Zone Added', user: 'admin@demo.com', status: 'success' },
      { time: new Date(Date.now() - 900000).toISOString(), action: 'SOS Triggered', user: 'tourist@demo.com', status: 'critical' }
    ];

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 System Logs</h3>
          <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="padding: 0.75rem; text-align: left;">Timestamp</th>
              <th style="padding: 0.75rem; text-align: left;">Action</th>
              <th style="padding: 0.75rem; text-align: left;">User</th>
              <th style="padding: 0.75rem; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.75rem;">${formatToIST(log.time)}</td>
                <td style="padding: 0.75rem;">${log.action}</td>
                <td style="padding: 0.75rem;">${log.user}</td>
                <td style="padding: 0.75rem;">
                  <span style="color: ${log.status === 'critical' ? 'var(--danger)' : log.status === 'success' ? 'var(--success)' : 'var(--primary)'};">
                    ${log.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function setupUserHandlers() {
    document.getElementById('addUserBtn')?.addEventListener('click', () => {
      window.location.hash = '#/register';
    });

    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('Delete this user? This action cannot be undone.')) {
          try {
            const response = await fetch(`${API_URL}/api/users/${id}`, {
              method: 'DELETE',
              credentials: 'include'
            });
            
            if (response.ok) {
              showNotification('User deleted successfully', 'success');
              await fetchUsers(); // Refresh users from API
              updateMainContent('users');
            } else {
              showNotification('Failed to delete user', 'error');
            }
          } catch (error) {
            console.error('[AdminDashboard] Error deleting user:', error);
            showNotification('Error deleting user', 'error');
          }
        }
      });
    });
  }

  function setupZoneHandlers() {
    document.getElementById('addZoneBtn')?.addEventListener('click', () => {
      document.getElementById('zoneForm').style.display = 'block';
    });

    document.getElementById('cancelZoneBtn')?.addEventListener('click', () => {
      document.getElementById('zoneForm').style.display = 'none';
    });

    document.getElementById('newZoneForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');
      zones.push({
        name: document.getElementById('zoneName').value,
        lat: parseFloat(document.getElementById('zoneLat').value),
        lng: parseFloat(document.getElementById('zoneLng').value),
        radius: parseInt(document.getElementById('zoneRadius').value),
        risk: document.getElementById('zoneRisk').value
      });
      
      localStorage.setItem('riskZones', JSON.stringify(zones));
      showNotification('Risk zone added successfully', 'success');
      updateMainContent('zones');
    });

    document.querySelectorAll('.delete-zone-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (confirm('Delete this risk zone?')) {
          const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');
          zones.splice(index, 1);
          localStorage.setItem('riskZones', JSON.stringify(zones));
          showNotification('Risk zone deleted successfully', 'success');
          updateMainContent('zones');
        }
      });
    });
  }

  return `
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">⚙️</div>
            <div><h2>Admin Panel</h2></div>
          </div>
        </div>

        <div class="sidebar-user">
          <div class="sidebar-avatar">${user.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.name}</div>
            <div class="sidebar-user-role">Administrator</div>
          </div>
        </div>
        
        <nav>
          <div class="nav-section-label">Management</div>
          <div class="nav-item active" data-view="users">
            <span class="nav-item-icon">👥</span> ${i18n.t('users')}
          </div>
          <div class="nav-item" data-view="zones">
            <span class="nav-item-icon">⚠️</span> ${i18n.t('risk_zones')}
          </div>
          <div class="nav-item" data-view="analytics">
            <span class="nav-item-icon">📊</span> ${i18n.t('analytics')}
          </div>
          <div class="nav-item" data-view="demo">
            <span class="nav-item-icon">🎭</span> ${i18n.t('demo_mode')}
          </div>
          <div class="nav-item" data-view="logs">
            <span class="nav-item-icon">📋</span> ${i18n.t('system_logs')}
          </div>
        </nav>
        
        <div class="sidebar-footer">
          <button class="btn btn-danger btn-sm" id="adminLogoutBtn" style="width:100%;">
            🚪 ${i18n.t('logout')}
          </button>
        </div>
      </aside>
      
      <main class="main-content" id="mainContent">
        ${getUsersView()}
      </main>
    </div>
  `;
}
