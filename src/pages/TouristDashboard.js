import { authAPIService } from '../services/auth-api.js';
import { locationService } from '../services/location.js';
import { incidentService } from '../services/incident.js';
import { i18n, LANGUAGE_OPTIONS } from '../services/i18n.js';
import { locationDataService } from '../services/location-data.js';
import { createLocationFilter, setupLocationFilterHandlers } from '../components/LocationFilter.js';
import { formatToIST, formatTimeIST } from '../utils/time.js';
import { riskEngine, RISK_LEVELS } from '../services/risk-engine.js';
import { smartAlerts } from '../services/smart-alerts.js';
import { createChatbotWidget } from '../components/ChatbotWidget.js';
import { queueOfflineEvent, syncOfflineQueue, isOnline, getQueueLength } from '../services/offlineSyncService.js';
import { triggerSMSFallback } from '../services/smsFallbackService.js';
import { toast } from '../utils/notify.js';
import { incidentsAPI } from '../services/apiClient.js';

export function TouristDashboard() {
  const user = authAPIService.getCurrentUser();
  
  // Debug logging
  console.log('[TouristDashboard] Initializing with user:', user);
  
  if (!user) {
    console.error('[TouristDashboard] No user found, redirecting to login');
    window.location.hash = '#/login';
    return '<div>Loading...</div>';
  }
  
  if (!user.blockchainId) {
    user.blockchainId = 'BLK-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    localStorage.setItem('user', JSON.stringify(user));
  }
  
  console.log('[TouristDashboard] User loaded:', {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    blockchainId: user.blockchainId
  });
  
  let currentView = 'home';
  let map = null;
  let userMarker = null;
  let selectedState = 'all';
  let selectedCity = 'all';

  setTimeout(() => {
    console.log('[TouristDashboard] Initializing all handlers...');
    
    initializeSocketIO();
    setupNavigation();
    initializeGlobalButtons();
    
    // Start risk engine + smart alerts
    riskEngine.start();
    smartAlerts.start();

    // Mount floating chatbot
    createChatbotWidget(user.id);

    // Offline sync: notify when queue flushes
    window.addEventListener('offlineSyncComplete', (e) => {
      showNotification(`✅ ${e.detail.synced} ${i18n.t('synced_toast')}`, 'success');
    });

    window.addEventListener('offline', () => {
      showNotification(i18n.t('offline_toast'), 'error');
    });
    window.addEventListener('online', () => {
      showNotification(i18n.t('online_toast'), 'info');
    });
    
    // Listen for smart alerts → show as toast
    window.addEventListener('smartAlert', (e) => {
      const { message, severity } = e.detail;
      showNotification(message, severity === 'danger' ? 'error' : severity);
    });
    
    // Listen for risk updates → update home view risk card
    window.addEventListener('riskUpdate', () => {
      if (currentView === 'home') updateRiskCard();
    });
    
    // Initialize first view
    updateMainContent('home');
    
    console.log('[TouristDashboard] All handlers initialized');
  }, 100);
  
  function initializeGlobalButtons() {
    console.log('[TouristDashboard] Setting up global buttons...');
    setupLanguageToggle();
    initializeSOSButton();

    // SMS fallback quick action - now sends actual SMS via Twilio
    const smsFallbackBtn = document.getElementById('smsFallbackBtn');
    if (smsFallbackBtn) {
      console.log('[TouristDashboard] SMS Fallback button found, attaching listener');
      
      smsFallbackBtn.addEventListener('click', async () => {
        console.log('[TouristDashboard] 📱 SMS Fallback button clicked!');
        
        const loc = locationService.getCurrentLocation();
        const { score } = riskEngine.getStatus();
        
        if (!loc) {
          console.error('[TouristDashboard] Location unavailable for SMS');
          showNotification('Location unavailable', 'error');
          return;
        }
        
        console.log('[TouristDashboard] Location:', loc);
        console.log('[TouristDashboard] Risk score:', score);
        
        if (confirm('Send emergency SMS to your emergency contact?')) {
          console.log('[TouristDashboard] SMS confirmed, sending to backend...');
          
          try {
            const incidentData = {
              userId: user.id,
              type: 'sos',
              description: 'Emergency SMS Alert',
              severity: 'critical',
              location: loc,
              method: 'sms_fallback'
            };
            
            console.log('[TouristDashboard] Incident data:', incidentData);
            
            // Try to send via backend (Twilio)
            const data = await incidentsAPI.create(incidentData);
            
            if (data) {
              console.log('[TouristDashboard] ✅ Emergency SMS sent successfully!', data);
              showNotification('Emergency SMS sent successfully!', 'success');
            }
          } catch (error) {
            console.error('[TouristDashboard] ❌ Backend failed, showing manual fallback:', error);
            console.error('[TouristDashboard] Error details:', error.message, error.stack);
            // If backend fails, show manual fallback
            triggerSMSFallback(loc, score);
          }
        } else {
          console.log('[TouristDashboard] SMS cancelled by user');
        }
      });
      
      console.log('[TouristDashboard] SMS Fallback button initialized successfully');
    } else {
      console.warn('[TouristDashboard] SMS Fallback button not found');
    }

    console.log('[TouristDashboard] Global buttons initialized');
  }

  function initializeSocketIO() {
    import('../services/socket.js').then(({ socketService }) => {
      socketService.connect();
      console.log('[TouristDashboard] Socket.IO initialized');
    }).catch(err => {
      console.warn('[TouristDashboard] Socket.IO not available:', err);
    });
  }

  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    console.log('[TouristDashboard] Setting up navigation, found', navItems.length, 'nav items');
    
    navItems.forEach(item => {
      const view = item.dataset.view;
      console.log('[TouristDashboard] Setting up nav item:', view);
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[TouristDashboard] Nav item clicked:', view);
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        // Update content
        updateMainContent(view);
      });
    });
    
    console.log('[TouristDashboard] Navigation setup complete');
  }

  function setupLanguageToggle() {
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
      const updateLangButton = () => {
        const current = LANGUAGE_OPTIONS.find(l => l.code === i18n.currentLang)?.label || 'English';
        langBtn.textContent = `🌐 ${current}`;
      };
      updateLangButton();

      const newLangBtn = langBtn.cloneNode(true);
      langBtn.parentNode.replaceChild(newLangBtn, langBtn);

      newLangBtn.addEventListener('click', () => {
        // Cycle through available languages
        const codes = LANGUAGE_OPTIONS.map(l => l.code);
        const next = codes[(codes.indexOf(i18n.currentLang) + 1) % codes.length];
        i18n.setLanguage(next);
      });
    }
  }
  
  function handleLogout() {
    console.log('[TouristDashboard] Logout clicked');
    if (confirm(i18n.t('logout_confirm') || 'Are you sure you want to logout?')) {
      console.log('[TouristDashboard] Logout confirmed, calling authAPIService.logout()');
      authAPIService.logout();
    } else {
      console.log('[TouristDashboard] Logout cancelled');
    }
  }

  function initializeMap() {
    // Wait for Leaflet to be available
    if (typeof L === 'undefined') {
      console.warn('[TouristDashboard] Leaflet not loaded yet, retrying...');
      setTimeout(initializeMap, 500);
      return;
    }
    
    const mapEl = document.getElementById('touristMap');
    if (!mapEl) {
      console.warn('[TouristDashboard] Map element not found');
      return;
    }

    // Remove existing map if any
    if (map) {
      map.remove();
      map = null;
    }

    try {
      // Get current location or use selected location filter
      const currentLoc = locationService.getCurrentLocation();
      
      let initialLat, initialLng, initialZoom;
      
      if (selectedState !== 'all' || selectedCity !== 'all') {
        // Use selected location from filter
        const coords = locationDataService.getLocationCoordinates(selectedState, selectedCity);
        initialLat = coords.lat;
        initialLng = coords.lng;
        initialZoom = coords.zoom;
      } else if (currentLoc) {
        // Use current location
        initialLat = currentLoc.lat;
        initialLng = currentLoc.lng;
        initialZoom = 15;
      } else {
        // Default to Delhi
        initialLat = 28.6139;
        initialLng = 77.2090;
        initialZoom = 13;
      }

      // Initialize map
      map = L.map('touristMap').setView([initialLat, initialLng], initialZoom);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add user marker if location available
      if (currentLoc) {
        userMarker = L.marker([currentLoc.lat, currentLoc.lng], {
          icon: L.divIcon({
            className: 'user-marker',
            html: '<div style="background: #2563eb; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        })
        .addTo(map)
        .bindPopup(`<strong>${i18n.t('you_are_here')}</strong><br>${user.name}<br>${i18n.t('lat')}: ${currentLoc.lat.toFixed(4)}<br>${i18n.t('lng')}: ${currentLoc.lng.toFixed(4)}`)
        .openPopup();
      }

      // Listen for location updates
      locationService.onLocationUpdate((location) => {
        if (!map) return;
        
        // Update or create marker
        if (userMarker) {
          userMarker.setLatLng([location.lat, location.lng]);
          userMarker.setPopupContent(`<strong>${i18n.t('you_are_here')}</strong><br>${user.name}<br>${i18n.t('lat')}: ${location.lat.toFixed(4)}<br>${i18n.t('lng')}: ${location.lng.toFixed(4)}`);
        } else {
          userMarker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
              className: 'user-marker',
              html: '<div style="background: #2563eb; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            })
          })
          .addTo(map)
          .bindPopup(`<strong>${i18n.t('you_are_here')}</strong><br>${user.name}<br>${i18n.t('lat')}: ${location.lat.toFixed(4)}<br>${i18n.t('lng')}: ${location.lng.toFixed(4)}`);
        }
        
        // Center map on new location only if no filter is applied
        if (selectedState === 'all' && selectedCity === 'all') {
          map.setView([location.lat, location.lng], 15, {
            animate: true,
            duration: 1
          });
        }
      });

      console.log('[TouristDashboard] Map initialized successfully');
    } catch (error) {
      console.error('[TouristDashboard] Map initialization error:', error);
    }
  }

  function initializeTracking() {
    console.log('[TouristDashboard] Initializing tracking toggle');
    
    const toggle = document.getElementById('trackingToggle');
    if (!toggle) {
      console.warn('[TouristDashboard] Tracking toggle not found');
      return;
    }
    
    toggle.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      console.log('[TouristDashboard] Tracking toggle changed:', isChecked);
      
      if (isChecked) {
        // ── Optimistic UI: update immediately before server confirms ──
        updateTrackingUI(true);
        
        locationService.startTracking();
        showNotification(i18n.t('tracking_enabled'), 'success');
        
        setTimeout(() => {
          if (currentView === 'home') {
            initializeMap();
          }
        }, 1000);
      } else {
        // ── Optimistic UI: update immediately ──
        updateTrackingUI(false);
        
        locationService.stopTracking();
        showNotification(i18n.t('tracking_disabled_toast'), 'info');
      }
    });
    
    console.log('[TouristDashboard] Tracking toggle initialized');
  }

  /**
   * Update all tracking-related UI elements without a full re-render.
   * Called both optimistically (instant) and on ACK confirmation.
   */
  function updateTrackingUI(active) {
    console.log('[TouristDashboard] Updating tracking UI, active:', active);

    // 1. Stat card border color
    const statCard = document.getElementById('trackingToggle')?.closest('.stat-card');
    if (statCard) {
      statCard.style.borderLeftColor = active ? 'var(--success)' : 'var(--text-light)';
    }

    // 2. Status text below toggle
    const statusText = document.getElementById('trackingStatusText');
    if (statusText) {
      statusText.textContent = active ? '📍 Active' : '📍 Inactive';
      statusText.style.color = active ? 'var(--success)' : 'var(--text-light)';
    }

    // 3. Live Tracking badge in card header
    const trackingBadge = document.getElementById('trackingBadge');
    if (trackingBadge) {
      if (active) {
        trackingBadge.innerHTML = `
          <span style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--success);color:white;border-radius:2rem;font-size:0.85rem;">
            <span class="pulse-dot"></span>${i18n.t('live_tracking')}
          </span>`;
      } else {
        trackingBadge.innerHTML = `
          <span style="padding:0.5rem 1rem;background:var(--text-light);color:white;border-radius:2rem;font-size:0.85rem;">
            ${i18n.t('tracking_disabled_badge')}
          </span>`;
      }
    }

    // 4. Warning alert in alerts section
    const trackingWarning = document.getElementById('trackingWarning');
    if (trackingWarning) {
      trackingWarning.style.display = active ? 'none' : 'block';
    }
  }

  // SOS button state management
  let sosButtonCooldown = false;
  let sosButtonLastClick = 0;
  const SOS_COOLDOWN_MS = 30000; // 30 seconds
  
  function initializeSOSButton() {
    const sosBtn = document.getElementById('sosButton');
    
    if (!sosBtn) {
      console.warn('[TouristDashboard] SOS button not found');
      return;
    }
    
    console.log('[TouristDashboard] SOS button found, attaching listener');
    
    // Remove any existing listeners by cloning the button
    const newSosBtn = sosBtn.cloneNode(true);
    sosBtn.parentNode.replaceChild(newSosBtn, sosBtn);
    
    newSosBtn.addEventListener('click', async (e) => {
      // Prevent multiple clicks
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[TouristDashboard] 🚨 SOS button clicked!');
      
      // Check cooldown
      const now = Date.now();
      const timeSinceLastClick = now - sosButtonLastClick;
      
      if (sosButtonCooldown) {
        const remainingSeconds = Math.ceil((SOS_COOLDOWN_MS - timeSinceLastClick) / 1000);
        console.warn(`[TouristDashboard] SOS button on cooldown. Wait ${remainingSeconds}s`);
        showNotification(`Please wait ${remainingSeconds} seconds before sending another SOS`, 'warning');
        return;
      }
      
      // Disable button immediately
      newSosBtn.disabled = true;
      newSosBtn.style.opacity = '0.6';
      newSosBtn.style.cursor = 'not-allowed';
      
      if (confirm(i18n.t('sos_confirm') || 'Are you sure you want to send an SOS alert? This will notify authorities immediately.')) {
        console.log('[TouristDashboard] SOS confirmed by user');
        
        // Set cooldown
        sosButtonCooldown = true;
        sosButtonLastClick = now;
        
        const location = locationService.getCurrentLocation();
        
        if (!location) {
          console.error('[TouristDashboard] Location unavailable');
          showNotification(i18n.t('location_unavailable'), 'error');
          // Re-enable button
          newSosBtn.disabled = false;
          newSosBtn.style.opacity = '1';
          newSosBtn.style.cursor = 'pointer';
          sosButtonCooldown = false;
          return;
        }
        
        console.log('[TouristDashboard] Location:', location);
        console.log('[TouristDashboard] User ID:', user.id);
        console.log('[TouristDashboard] Sending SOS to backend...');
        
        try {
          const timestamp = new Date().toISOString();
          const incidentData = {
            userId: user.id,
            type: 'sos',
            description: `🚨 EMERGENCY SOS ALERT - Triggered via button at ${timestamp}`,
            severity: 'critical',
            location: location,
            method: 'button',
            timestamp: timestamp
          };
          
          console.log('[TouristDashboard] Incident data:', incidentData);
          
          const data = await incidentsAPI.create(incidentData);

          if (data) {
            console.log('[TouristDashboard] ✅ SOS sent successfully:', data);
            const incident = incidentService.triggerSOS(user.id, location);
            showNotification(i18n.t('sos_sent_toast') || 'SOS alert sent! Help is on the way.', 'success');
            newSosBtn.style.animation = 'pulse 0.5s ease-in-out 3';
            
            // Start cooldown timer
            setTimeout(() => {
              sosButtonCooldown = false;
              newSosBtn.disabled = false;
              newSosBtn.style.opacity = '1';
              newSosBtn.style.cursor = 'pointer';
              console.log('[TouristDashboard] SOS button cooldown ended');
            }, SOS_COOLDOWN_MS);
            
            setTimeout(() => {
              currentView = 'incidents';
              document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
              document.querySelector('.nav-item[data-view="incidents"]')?.classList.add('active');
              updateMainContent('incidents');
            }, 2000);
          }
        } catch (error) {
          console.error('[TouristDashboard] ❌ Failed to send SOS:', error);
          console.error('[TouristDashboard] Error details:', error.message, error.stack);

          // Re-enable button on error
          newSosBtn.disabled = false;
          newSosBtn.style.opacity = '1';
          newSosBtn.style.cursor = 'pointer';
          sosButtonCooldown = false;

          // Queue for later sync if offline
          queueOfflineEvent('incidents', {
            userId: user.id,
            type: 'sos',
            description: 'Emergency SOS Alert (queued offline)',
            severity: 'critical',
            location,
            method: 'button'
          });

          // Show SMS fallback so user can send manually
          triggerSMSFallback(location, riskEngine.getStatus().score);

          showNotification(i18n.t('sos_offline') || 'Failed to send SOS. SMS fallback shown.', 'error');
        }
      } else {
        console.log('[TouristDashboard] SOS cancelled by user');
        // Re-enable button if cancelled
        newSosBtn.disabled = false;
        newSosBtn.style.opacity = '1';
        newSosBtn.style.cursor = 'pointer';
      }
    }, { once: false }); // Don't use 'once' to allow cooldown logic
    
    console.log('[TouristDashboard] SOS button initialized successfully with 30s cooldown');
  }
  
  function showNotification(message, type = 'info') {
    toast(message, type);
  }

  function updateMainContent(view) {
    console.log('[TouristDashboard] Updating content to view:', view);
    const content = document.getElementById('mainContent');
    
    if (!content) {
      console.error('[TouristDashboard] Main content element not found');
      return;
    }
    
    currentView = view;
    
    // Update content HTML
    if (view === 'home') {
      content.innerHTML = getHomeView();
    } else if (view === 'id') {
      content.innerHTML = getProfileView();
    } else if (view === 'incidents') {
      content.innerHTML = getIncidentsView();
    } else if (view === 'settings') {
      content.innerHTML = getSettingsView();
    }
    
    // Reattach view-specific handlers after DOM update
    setTimeout(() => {
      console.log('[TouristDashboard] Reattaching handlers for view:', view);
      
      if (view === 'home') {
        initializeMap();
        initializeTracking();
        setupLocationFilterHandlers(handleLocationFilterChange, handleLocationFilterChange);
      } else if (view === 'id') {
        generateQRCode();
        setupProfileHandlers();
      } else if (view === 'incidents') {
        setupIncidentForm();
        setupLocationFilterHandlers(handleLocationFilterChange, handleLocationFilterChange);
      } else if (view === 'settings') {
        setupSettingsHandlers();
      }
      
      // Reinitialize global buttons that might be in the new content
      initializeSOSButton();
      setupLanguageToggle();
      
      console.log('[TouristDashboard] Handlers reattached for view:', view);
    }, 50);
    
    console.log('[TouristDashboard] Content updated successfully');
  }
  
  function setupSettingsHandlers() {
    console.log('[TouristDashboard] Setting up settings handlers');
    
    // Dark mode toggle
    const darkCheck = document.getElementById('darkModeCheck');
    if (darkCheck) {
      darkCheck.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        console.log('[TouristDashboard] Theme changed to:', theme);
      });
    }

    // Language selector in settings
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      langSelect.value = i18n.currentLang;
      langSelect.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value); // triggers re-render, no reload
      });
    }

    // Logout button in settings
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        console.log('[TouristDashboard] Settings logout button clicked');
        handleLogout();
      });
    }
    
    // Voice commands toggle
    const voiceCheck = document.getElementById('voiceCommandsCheck');
    if (voiceCheck) {
      voiceCheck.addEventListener('change', (e) => {
        console.log('[TouristDashboard] Voice commands toggled:', e.target.checked);
        if (e.target.checked) {
          import('../services/voice.js').then(({ voiceService }) => {
            const started = voiceService.start();
            if (started) {
              showNotification(i18n.t('voice_enabled'), 'success');
            } else {
              e.target.checked = false;
              showNotification(i18n.t('voice_unsupported'), 'error');
            }
          });
        } else {
          import('../services/voice.js').then(({ voiceService }) => {
            voiceService.stop();
            showNotification(i18n.t('voice_disabled'), 'info');
          });
        }
      });
    }
    
    // Notifications toggle
    const notifCheck = document.getElementById('notificationsCheck');
    if (notifCheck) {
      notifCheck.addEventListener('change', (e) => {
        console.log('[TouristDashboard] Notifications toggled:', e.target.checked);
        if (e.target.checked) {
          showNotification(i18n.t('notif_enabled'), 'success');
        } else {
          showNotification(i18n.t('notif_disabled'), 'info');
        }
      });
    }
    
    // Location sharing toggle
    const shareCheck = document.getElementById('shareLocationCheck');
    if (shareCheck) {
      shareCheck.addEventListener('change', (e) => {
        console.log('[TouristDashboard] Location sharing toggled:', e.target.checked);
        if (e.target.checked) {
          showNotification(i18n.t('location_sharing_enabled'), 'success');
        } else {
          showNotification(i18n.t('location_sharing_disabled'), 'info');
        }
      });
    }
    
    console.log('[TouristDashboard] Settings handlers setup complete');
  }

  function updateRiskCard() {
    const { score, predictedScore, level } = riskEngine.getStatus();
    const card = document.getElementById('riskScoreCard');
    if (!card) return;
    const statusClass = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'safe';
    card.className = `safety-status-card ${statusClass}`;
    const val = card.querySelector('.risk-score-value');
    const lbl = card.querySelector('.risk-score-label');
    if (val) { val.textContent = score; val.style.color = level.color; }
    if (lbl) { lbl.textContent = level.label; lbl.style.color = level.color; }
    const icon = card.querySelector('.score-icon');
    if (icon) icon.textContent = level.icon;
  }

  function getHomeView() {
    const trackingActive = locationService.tracking;
    const currentLoc = locationService.getCurrentLocation();
    const { score: riskScore, predictedScore, level: riskLevel } = riskEngine.getStatus();
    const statusClass = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'safe';

    return `
      <!-- Safety Status Card -->
      <div class="safety-status-card ${statusClass}" id="riskScoreCard">
        <div class="score-row">
          <div>
            <div class="score-main risk-score-value" style="color:${riskLevel.color};">${riskScore}</div>
            <div class="score-label risk-score-label" style="color:${riskLevel.color};">${riskLevel.label}</div>
            ${predictedScore > riskScore ? `
              <div class="predicted-badge" style="margin-top:.5rem;">
                <span class="predicted-icon">🔮</span> ${i18n.t('predicted')}: ${predictedScore}
              </div>` : ''}
          </div>
          <div style="text-align:right;">
            <div class="score-icon">${riskLevel.icon}</div>
            <div style="margin-top:.5rem;">
              <label class="switch" title="${i18n.t('location_tracking')}">
                <input type="checkbox" id="trackingToggle" ${trackingActive ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <div id="trackingStatusText" style="font-size:.7rem;color:${trackingActive ? 'var(--success)' : 'var(--text-muted)'};margin-top:.2rem;text-align:center;">
                ${trackingActive ? '📍 Active' : '📍 Off'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="quick-actions">
        <button class="action-btn danger" id="sosButton" aria-label="SOS">
          <span class="action-icon">🚨</span>
          <span class="action-label">${i18n.t('sos_alert')}</span>
        </button>
        <button class="action-btn" onclick="document.querySelector('.nav-item[data-view=incidents]')?.click()">
          <span class="action-icon">📋</span>
          <span class="action-label">${i18n.t('report_incident_btn')}</span>
        </button>
        <button class="action-btn ai" onclick="document.querySelector('.cb-fab')?.click()">
          <span class="action-icon">🤖</span>
          <span class="action-label">${i18n.t('ai_assistant')}</span>
        </button>
        <button class="action-btn" onclick="document.getElementById('trackingToggle')?.click()">
          <span class="action-icon">📍</span>
          <span class="action-label">${i18n.t('share_location_btn')}</span>
        </button>
        <button class="action-btn" id="smsFallbackBtn">
          <span class="action-icon">📩</span>
          <span class="action-label">${i18n.t('sms_fallback')}</span>
        </button>
        <button class="action-btn danger" onclick="window.location.href='tel:112'" aria-label="Call 112 emergency">
          <span class="action-icon">📞</span>
          <span class="action-label">${i18n.t('call_112')}</span>
        </button>
      </div>

      <!-- Live Map -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📍 ${i18n.t('live_location')}</h3>
          <div id="trackingBadge">
            ${trackingActive
              ? `<span style="display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .85rem;background:var(--success);color:#fff;border-radius:var(--r-full);font-size:.78rem;font-weight:600;"><span class="pulse-dot"></span>${i18n.t('live_tracking')}</span>`
              : `<span style="padding:.35rem .85rem;background:var(--text-muted);color:#fff;border-radius:var(--r-full);font-size:.78rem;font-weight:600;">${i18n.t('tracking_disabled_badge')}</span>`}
          </div>
        </div>
        ${createLocationFilter({ selectedState, selectedCity, inline: true, showLabel: true })}
        <div id="touristMap" class="map-container"></div>
        ${currentLoc?.accuracy ? `
          <div style="padding:.6rem 1rem;background:var(--bg);border-top:1px solid var(--border);font-size:.78rem;color:var(--text-light);">
            📡 ${i18n.t('accuracy')}: ±${Math.round(currentLoc.accuracy)}m · ${formatTimeIST(currentLoc.timestamp)}
          </div>` : ''}
      </div>

      <!-- Alerts Timeline -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔔 ${i18n.t('active_alerts')}</h3>
        </div>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-dot success"></div>
            <div class="timeline-content">
              <div class="timeline-title">✓ ${i18n.t('safety_tip')}</div>
              <div class="timeline-meta">${i18n.t('safety_tip_msg')}</div>
            </div>
          </div>
          <div class="timeline-item" id="trackingWarning" ${trackingActive ? 'style="display:none"' : ''}>
            <div class="timeline-dot warning"></div>
            <div class="timeline-content">
              <div class="timeline-title">⚠️ ${i18n.t('tracking_disabled_title')}</div>
              <div class="timeline-meta">${i18n.t('tracking_disabled_msg')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getProfileView() {
    const photoUrl = user.profile_photo || 'https://via.placeholder.com/150?text=No+Photo';
    
    return `
      <div class="card">
        <div class="digital-id">
          <h2>🆔 ${i18n.t('digital_id')}</h2>
          <p style="font-size: 1.1rem; font-weight: 600;">${user.name}</p>
          <div class="qr-code" id="qrCode"></div>
          <div class="blockchain-badge">
            <span>🔗</span>
            <span>${i18n.t('blockchain_verified')}</span>
          </div>
          <p style="font-size: 0.9rem; margin-top: 1rem;">
            ${i18n.t('blockchain_id')}: <code>${user.blockchainId}</code>
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title" style="margin: 0;">👤 ${i18n.t('my_profile')}</h3>
          <button id="profileEditBtn" class="btn btn-primary" style="font-size: 0.85rem; padding: 0.4rem 1rem;">
            ✏️ ${i18n.t('edit')}
          </button>
        </div>

        <div style="padding: 1rem 0;">
          <!-- Profile Photo -->
          <div class="form-group" style="margin-bottom: 1.5rem; text-align: center;">
            <label style="font-size: 0.8rem; color: var(--text-light); display: block; margin-bottom: 0.5rem;">
              📸 Profile Photo
            </label>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
              <img 
                id="profilePhotoPreview" 
                src="${photoUrl}" 
                alt="Profile" 
                style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
              />
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
                <label for="profilePhotoInput" class="btn btn-primary btn-sm" style="cursor: pointer;">
                  📤 Upload Photo
                </label>
                <input 
                  type="file" 
                  id="profilePhotoInput" 
                  accept="image/*" 
                  style="display: none;"
                />
                ${user.profile_photo ? '<button id="deletePhotoBtn" class="btn btn-danger btn-sm">🗑️ Remove</button>' : ''}
              </div>
              <div id="photoUploadMsg" style="font-size: 0.85rem; display: none;"></div>
            </div>
          </div>

          <!-- Read-only fields -->
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-size: 0.8rem; color: var(--text-light); display: block; margin-bottom: 0.25rem;">
              ${i18n.t('name')}
            </label>
            <div style="padding: 0.6rem 0.75rem; background: var(--bg); border-radius: 0.4rem; border: 1px solid var(--border);">
              ${user.name}
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-size: 0.8rem; color: var(--text-light); display: block; margin-bottom: 0.25rem;">
              ${i18n.t('email')}
            </label>
            <div style="padding: 0.6rem 0.75rem; background: var(--bg); border-radius: 0.4rem; border: 1px solid var(--border);">
              ${user.email}
            </div>
          </div>

          <!-- Editable fields -->
          <div class="form-group" style="margin-bottom: 1rem;">
            <label for="profilePhone" style="font-size: 0.8rem; color: var(--text-light); display: block; margin-bottom: 0.25rem;">
              ${i18n.t('phone')}
            </label>
            <div id="profilePhoneDisplay" style="padding: 0.6rem 0.75rem; background: var(--bg); border-radius: 0.4rem; border: 1px solid var(--border);">
              ${user.phone || '—'}
            </div>
            <input
              type="tel"
              id="profilePhone"
              class="form-control"
              value="${user.phone || ''}"
              placeholder="+91-XXXXXXXXXX"
              style="display: none;"
            />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="profileEmergency" style="font-size: 0.8rem; color: var(--text-light); display: block; margin-bottom: 0.25rem;">
              ${i18n.t('emergency_contact')}
            </label>
            <div id="profileEmergencyDisplay" style="padding: 0.6rem 0.75rem; background: var(--bg); border-radius: 0.4rem; border: 1px solid var(--border);">
              ${user.emergencyContact || '—'}
            </div>
            <input
              type="tel"
              id="profileEmergency"
              class="form-control"
              value="${user.emergencyContact || ''}"
              placeholder="+91-XXXXXXXXXX"
              style="display: none;"
            />
          </div>

          <!-- Save / Cancel (hidden until edit mode) -->
          <div id="profileActions" style="display: none; gap: 0.75rem; flex-wrap: wrap;">
            <button id="profileSaveBtn" class="btn btn-success" style="flex: 1; min-width: 120px;">
              💾 ${i18n.t('save_changes')}
            </button>
            <button id="profileCancelBtn" class="btn" style="flex: 1; min-width: 120px; background: var(--bg); border: 1px solid var(--border);">
              ${i18n.t('cancel')}
            </button>
          </div>

          <div id="profileMsg" style="margin-top: 0.75rem; font-size: 0.85rem; display: none;"></div>
        </div>
      </div>
    `;
  }

  function setupProfileHandlers() {
    const editBtn    = document.getElementById('profileEditBtn');
    const saveBtn    = document.getElementById('profileSaveBtn');
    const cancelBtn  = document.getElementById('profileCancelBtn');
    const actions    = document.getElementById('profileActions');
    const msg        = document.getElementById('profileMsg');

    const phoneDisplay     = document.getElementById('profilePhoneDisplay');
    const emergencyDisplay = document.getElementById('profileEmergencyDisplay');
    const phoneInput       = document.getElementById('profilePhone');
    const emergencyInput   = document.getElementById('profileEmergency');
    
    // Photo upload elements
    const photoInput = document.getElementById('profilePhotoInput');
    const photoPreview = document.getElementById('profilePhotoPreview');
    const photoMsg = document.getElementById('photoUploadMsg');
    const deletePhotoBtn = document.getElementById('deletePhotoBtn');

    if (!editBtn) return;
    
    // Photo upload handler
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          showPhotoMsg('❌ File too large. Max 5MB allowed.', 'var(--danger)');
          return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          showPhotoMsg('❌ Please select an image file.', 'var(--danger)');
          return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          photoPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', user.id); // Add userId to form data
        
        showPhotoMsg('⏳ Uploading...', 'var(--primary)');
        
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/profile/upload-photo`, {
            method: 'POST',
            credentials: 'include',
            body: formData
          });
          
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Upload failed');
          }
          
          const data = await res.json();
          user.profile_photo = data.path;
          localStorage.setItem('user', JSON.stringify(user));
          
          showPhotoMsg('✅ Photo uploaded successfully!', 'var(--success)');
          setTimeout(() => photoMsg.style.display = 'none', 3000);
          
          // Refresh view to show delete button
          setTimeout(() => updateMainContent('id'), 1000);
        } catch (error) {
          console.error('[Profile] Photo upload error:', error);
          showPhotoMsg(`❌ ${error.message}`, 'var(--danger)');
        }
      });
    }
    
    // Delete photo handler
    if (deletePhotoBtn) {
      deletePhotoBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to remove your profile photo?')) return;
        
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/profile/photo?userId=${user.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (!res.ok) throw new Error('Delete failed');
          
          user.profile_photo = null;
          localStorage.setItem('user', JSON.stringify(user));
          photoPreview.src = 'https://via.placeholder.com/150?text=No+Photo';
          
          showPhotoMsg('✅ Photo removed successfully!', 'var(--success)');
          setTimeout(() => updateMainContent('id'), 1000);
        } catch (error) {
          console.error('[Profile] Photo delete error:', error);
          showPhotoMsg(`❌ ${error.message}`, 'var(--danger)');
        }
      });
    }
    
    function showPhotoMsg(text, color) {
      photoMsg.textContent = text;
      photoMsg.style.color = color;
      photoMsg.style.display = 'block';
    }

    function enterEditMode() {
      phoneDisplay.style.display     = 'none';
      emergencyDisplay.style.display = 'none';
      phoneInput.style.display       = 'block';
      emergencyInput.style.display   = 'block';
      actions.style.display          = 'flex';
      editBtn.style.display          = 'none';
      msg.style.display              = 'none';
      phoneInput.focus();
    }

    function exitEditMode() {
      phoneDisplay.style.display     = 'block';
      emergencyDisplay.style.display = 'block';
      phoneInput.style.display       = 'none';
      emergencyInput.style.display   = 'none';
      actions.style.display          = 'none';
      editBtn.style.display          = 'inline-block';
    }

    editBtn.addEventListener('click', enterEditMode);
    cancelBtn.addEventListener('click', () => {
      // Reset inputs to current user values
      phoneInput.value     = user.phone || '';
      emergencyInput.value = user.emergencyContact || '';
      exitEditMode();
    });

    saveBtn.addEventListener('click', async () => {
      const newPhone     = phoneInput.value.trim();
      const newEmergency = emergencyInput.value.trim();

      if (!newPhone && !newEmergency) {
        showMsg('Please fill in at least one field.', 'var(--warning)');
        return;
      }

      saveBtn.disabled    = true;
      saveBtn.textContent = 'Saving…';

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phone: newPhone, emergencyContact: newEmergency })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }

        const data = await res.json();

        // Update in-memory user and localStorage
        user.phone            = data.user.phone;
        user.emergencyContact = data.user.emergencyContact;
        localStorage.setItem('user', JSON.stringify(user));

        // Refresh display values
        phoneDisplay.textContent     = user.phone || '—';
        emergencyDisplay.textContent = user.emergencyContact || '—';

        exitEditMode();
        showMsg('✅ Profile updated successfully.', 'var(--success)');
        showNotification(i18n.t('profile_updated'), 'success');

        console.log('[Profile] Saved:', { phone: user.phone, emergencyContact: user.emergencyContact });
      } catch (error) {
        console.error('[Profile] Save failed:', error);
        showMsg(`❌ ${error.message}`, 'var(--danger)');
      } finally {
        saveBtn.disabled    = false;
        saveBtn.textContent = '💾 Save Changes';
      }
    });

    function showMsg(text, color) {
      msg.textContent   = text;
      msg.style.color   = color;
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }
  }

  function getIncidentsView() {
    const allIncidents = incidentService.getIncidents({ userId: user.id });
    
    // Filter incidents by location if selected
    let incidents = allIncidents;
    if (selectedState !== 'all') {
      incidents = allIncidents.filter(inc => {
        if (!inc.location) return false;
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const filteredUsers = locationDataService.filterUsersByLocation(users, selectedState, selectedCity);
        return filteredUsers.some(u => u.id === inc.userId);
      });
    }
    
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${i18n.t('report_incident')}</h3>
        </div>
        
        <form id="incidentForm" class="incident-form">
          <div class="form-group">
            <label>${i18n.t('incident_type')}</label>
            <select id="incidentType" class="form-control" required>
              <option value="theft">${i18n.t('theft')}</option>
              <option value="harassment">${i18n.t('harassment')}</option>
              <option value="medical">${i18n.t('medical')}</option>
              <option value="lost">${i18n.t('lost')}</option>
              <option value="other">${i18n.t('other')}</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>${i18n.t('description')}</label>
            <textarea id="description" class="form-control" rows="4" required></textarea>
          </div>
          
          <div class="form-group">
            <label>${i18n.t('severity')}</label>
            <select id="severity" class="form-control" required>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <!-- ── Location Section ── -->
          <div class="form-group">
            <label style="display: block; margin-bottom: 0.5rem;">📍 ${i18n.t('location')}</label>

            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
              <button type="button" id="locModeGPS" class="btn btn-primary" style="flex:1; font-size:0.85rem; padding:0.4rem 0.75rem;">
                📡 ${i18n.t('use_gps')}
              </button>
              <button type="button" id="locModeManual" class="btn" style="flex:1; font-size:0.85rem; padding:0.4rem 0.75rem; background:var(--bg); border:1px solid var(--border);">
                ✏️ ${i18n.t('enter_manually')}
              </button>
            </div>

            <div id="locGPSPanel">
              <button type="button" id="getGPSBtn" class="btn btn-success" style="width:100%; margin-bottom:0.5rem;">
                🔍 ${i18n.t('detect_location')}
              </button>
              <div id="gpsStatus" style="font-size:0.82rem; color:var(--text-light); min-height:1.2rem;"></div>
              <input type="hidden" id="gpsLat" />
              <input type="hidden" id="gpsLng" />
            </div>

            <!-- Manual panel (hidden by default) -->
            <div id="locManualPanel" style="display:none;">
              <div style="display:grid; gap:0.5rem;">
                <select id="manualState" class="form-control">
                  <option value="">— Select State —</option>
                  ${locationDataService.getStates().filter(s => s.id !== 'all').map(s =>
                    `<option value="${s.id}">${s.name}</option>`
                  ).join('')}
                </select>
                <select id="manualCity" class="form-control">
                  <option value="">— Select City —</option>
                </select>
                <input type="text" id="manualLandmark" class="form-control"
                  placeholder="Landmark / Area (optional)" maxlength="120" />
              </div>
            </div>
          </div>
          <!-- ── End Location Section ── -->
          
          <div class="file-upload">
            <p>📷 ${i18n.t('upload_evidence')}</p>
            <input type="file" id="evidence" accept="image/*,video/*" multiple>
          </div>

          <div class="form-group" style="margin-top: 0.75rem;">
            <label>🎤 ${i18n.t('voice_note')}</label>
            <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.4rem;">
              <button type="button" id="voiceRecordBtn" class="btn btn-primary" style="flex:1;">
                🎤 ${i18n.t('start_recording')}
              </button>
              <span id="voiceRecordStatus" style="font-size:0.82rem; color:var(--text-light);"></span>
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" style="margin-top: 1rem; width:100%;">${i18n.t('submit')}</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${i18n.t('incident_history')}</h3>
        </div>
        
        ${createLocationFilter({
          onStateChange: handleLocationFilterChange,
          onCityChange: handleLocationFilterChange,
          showLabel: true,
          inline: true,
          selectedState: selectedState,
          selectedCity: selectedCity
        })}
        
        <div class="alert-list">
          ${incidents.length > 0 ? incidents.map(inc => `
            <div class="alert-item ${inc.severity === 'critical' ? 'critical' : ''} ${inc.status === 'resolved' ? 'resolved' : ''}">
              <strong>${inc.type.toUpperCase()}</strong> - ${inc.status}<br>
              ${inc.description}<br>
              <small>${formatToIST(inc.created_at)}</small>
              ${inc.location ? `<br><small>📍 ${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)}</small>` : ''}
              ${inc.responses && inc.responses.length > 0 ? `
                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
                  <small><strong>Latest Update:</strong> ${inc.responses[inc.responses.length - 1].message}</small>
                </div>
              ` : ''}
            </div>
          `).join('') : `<p style="text-align: center; padding: 2rem; color: var(--text-light);">${i18n.t('no_data')}</p>`}
        </div>
      </div>
    `;
  }
  
  function handleLocationFilterChange(stateId, cityId) {
    selectedState = stateId;
    selectedCity = cityId;
    updateMainContent(currentView);
  }

  function getSettingsView() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-gear"></i> ${i18n.t('settings')}</h3>
        </div>
        <div class="card-body">

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label"><i class="fa-solid fa-moon" style="color:var(--primary);margin-right:.4rem;"></i> ${i18n.t('dark_mode')}</div>
              <div class="setting-desc">${i18n.t('dark_mode_desc')}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="darkModeCheck" ${isDark ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label"><i class="fa-solid fa-language" style="color:var(--info);margin-right:.4rem;"></i> ${i18n.t('language')}</div>
              <div class="setting-desc">${i18n.t('language_desc')}</div>
            </div>
            <select class="form-control" id="languageSelect" style="width:auto;min-width:130px;">
              ${LANGUAGE_OPTIONS.map(l =>
                `<option value="${l.code}" ${i18n.currentLang === l.code ? 'selected' : ''}>${l.label}</option>`
              ).join('')}
            </select>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label"><i class="fa-solid fa-location-dot" style="color:var(--success);margin-right:.4rem;"></i> ${i18n.t('share_location')}</div>
              <div class="setting-desc">${i18n.t('share_location_desc')}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="shareLocationCheck" checked>
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label"><i class="fa-solid fa-bell" style="color:var(--warning);margin-right:.4rem;"></i> ${i18n.t('notifications')}</div>
              <div class="setting-desc">${i18n.t('notifications_desc')}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="notificationsCheck" checked>
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label"><i class="fa-solid fa-microphone" style="color:var(--danger);margin-right:.4rem;"></i> ${i18n.t('voice_commands')}</div>
              <div class="setting-desc">${i18n.t('voice_commands_desc')}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="voiceCommandsCheck">
              <span class="slider"></span>
            </label>
          </div>

          <div style="margin-top:1.5rem;">
            <button class="btn btn-danger" id="logoutBtn" style="width:100%;">
              <i class="fa-solid fa-right-from-bracket"></i> ${i18n.t('sign_out')}
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-circle-user"></i> ${i18n.t('account_info')}</h3>
        </div>
        <div class="card-body">
          <div style="display:grid;gap:.75rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border);">
              <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('name')}</span>
              <span style="font-size:.875rem;font-weight:600;">${user.name}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border);">
              <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('email')}</span>
              <span style="font-size:.875rem;">${user.email}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border);">
              <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('role')}</span>
              <span class="badge badge-primary">${user.role}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;">
              <span style="font-size:.82rem;color:var(--text-light);font-weight:500;">${i18n.t('blockchain_id')}</span>
              <code style="font-size:.78rem;background:var(--bg-2);padding:.2rem .5rem;border-radius:var(--r-sm);">${user.blockchainId}</code>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setupIncidentForm() {
    const form = document.getElementById('incidentForm');
    if (!form) {
      console.warn('[TouristDashboard] Incident form not found');
      return;
    }

    // ── Location mode state ──────────────────────────────────────────
    let locMode = 'gps';   // 'gps' | 'manual'
    let gpsCoords = null;  // { lat, lng } once acquired

    const gpsPanel    = document.getElementById('locGPSPanel');
    const manualPanel = document.getElementById('locManualPanel');
    const gpsStatus   = document.getElementById('gpsStatus');
    const gpsLatEl    = document.getElementById('gpsLat');
    const gpsLngEl    = document.getElementById('gpsLng');
    const btnGPS      = document.getElementById('locModeGPS');
    const btnManual   = document.getElementById('locModeManual');
    const manualState = document.getElementById('manualState');
    const manualCity  = document.getElementById('manualCity');

    // ── Mode toggle ──────────────────────────────────────────────────
    function setMode(mode) {
      locMode = mode;
      if (mode === 'gps') {
        gpsPanel.style.display    = 'block';
        manualPanel.style.display = 'none';
        btnGPS.classList.add('btn-primary');
        btnGPS.style.background = '';
        btnGPS.style.border = '';
        btnManual.classList.remove('btn-primary');
        btnManual.style.background = 'var(--bg)';
        btnManual.style.border = '1px solid var(--border)';
      } else {
        gpsPanel.style.display    = 'none';
        manualPanel.style.display = 'block';
        btnManual.classList.add('btn-primary');
        btnManual.style.background = '';
        btnManual.style.border = '';
        btnGPS.classList.remove('btn-primary');
        btnGPS.style.background = 'var(--bg)';
        btnGPS.style.border = '1px solid var(--border)';
      }
    }

    btnGPS.addEventListener('click', () => setMode('gps'));
    btnManual.addEventListener('click', () => setMode('manual'));

    // ── GPS detection ────────────────────────────────────────────────
    document.getElementById('getGPSBtn').addEventListener('click', () => {
      if (!navigator.geolocation) {
        gpsStatus.textContent = '❌ Geolocation not supported by your browser.';
        gpsStatus.style.color = 'var(--danger)';
        return;
      }

      gpsStatus.textContent = '⏳ Detecting location…';
      gpsStatus.style.color = 'var(--text-light)';

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          gpsLatEl.value = gpsCoords.lat;
          gpsLngEl.value = gpsCoords.lng;
          gpsStatus.textContent = `✅ ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}  (±${Math.round(pos.coords.accuracy)}m)`;
          gpsStatus.style.color = 'var(--success)';
          console.log('[IncidentForm] GPS acquired:', gpsCoords);
        },
        (err) => {
          const msgs = {
            1: 'Permission denied. Please allow location access.',
            2: 'Position unavailable. Try manual entry.',
            3: 'Request timed out. Try again.'
          };
          gpsStatus.textContent = `❌ ${msgs[err.code] || err.message}`;
          gpsStatus.style.color = 'var(--danger)';
          console.warn('[IncidentForm] GPS error:', err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });

    // ── Manual: populate cities when state changes ───────────────────
    manualState.addEventListener('change', () => {
      const stateId = manualState.value;
      const cities  = locationDataService.getCities(stateId);

      manualCity.innerHTML = '<option value="">— Select City —</option>';
      cities.filter(c => c.id !== 'all').forEach(c => {
        const opt = document.createElement('option');
        opt.value       = c.id;
        opt.textContent = c.name;
        manualCity.appendChild(opt);
      });
    });

    // ── Voice recording ──────────────────────────────────────────────
    let mediaRecorder = null;
    let audioChunks = [];
    let voiceAudioUrl = null;
    let isRecording = false;

    const voiceBtn    = document.getElementById('voiceRecordBtn');
    const voiceStatus = document.getElementById('voiceRecordStatus');

    if (voiceBtn) {
      voiceBtn.addEventListener('click', async () => {
        if (!isRecording) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
              const blob = new Blob(audioChunks, { type: 'audio/webm' });
              voiceAudioUrl = URL.createObjectURL(blob);
              voiceStatus.textContent = `✅ ${i18n.t('recording_saved')}`;
              voiceStatus.style.color = 'var(--success)';
              stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            voiceBtn.textContent = `⏹ ${i18n.t('stop_recording')}`;
            voiceBtn.classList.replace('btn-primary', 'btn-danger');
            voiceStatus.textContent = '🔴 Recording…';
            voiceStatus.style.color = 'var(--danger)';
          } catch (err) {
            voiceStatus.textContent = `❌ ${i18n.t('mic_denied')}`;
            voiceStatus.style.color = 'var(--danger)';
          }
        } else {
          mediaRecorder?.stop();
          isRecording = false;
          voiceBtn.textContent = `🎤 ${i18n.t('start_recording')}`;
          voiceBtn.classList.replace('btn-danger', 'btn-primary');
        }
      });
    }

    // ── Submit ───────────────────────────────────────────────────────
    // Clone to remove any stale listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Re-query after clone
    const submitBtn = newForm.querySelector('button[type="submit"]');

    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Build location payload
      let locationPayload = null;

      if (locMode === 'gps') {
        // Prefer freshly acquired GPS; fall back to tracking service
        const coords = gpsCoords || locationService.getCurrentLocation();
        if (!coords) {
          showNotification('⚠️ No GPS location. Click "Detect My Location" or switch to manual.', 'error');
          return;
        }
        locationPayload = { lat: coords.lat, lng: coords.lng };
      } else {
        // Manual mode
        const stateEl    = newForm.querySelector('#manualState');
        const cityEl     = newForm.querySelector('#manualCity');
        const landmarkEl = newForm.querySelector('#manualLandmark');

        const stateId  = stateEl?.value || '';
        const cityId   = cityEl?.value || '';
        const landmark = landmarkEl?.value.trim() || '';

        if (!stateId) {
          showNotification('⚠️ Please select a state.', 'error');
          return;
        }

        // Get human-readable names
        const stateObj = locationDataService.getStateById(stateId);
        const cityObj  = locationDataService.getCityById(stateId, cityId);

        locationPayload = {
          lat:      stateObj?.lat || null,
          lng:      stateObj?.lng || null,
          state:    stateObj?.name || stateId,
          city:     cityObj?.name  || cityId || null,
          landmark: landmark || null
        };
      }

      const payload = {
        userId:      user.id,
        type:        newForm.querySelector('#incidentType').value,
        description: newForm.querySelector('#description').value,
        severity:    newForm.querySelector('#severity').value,
        location:    locationPayload,
        method:      'manual'
      };

      console.log('[IncidentForm] Submitting:', payload);

      submitBtn.disabled    = true;
      submitBtn.textContent = i18n.t('loading') || 'Submitting…';

      try {
        const data = await incidentsAPI.create(payload);
        console.log('[IncidentForm] Created:', data.incident?.id);

        // Save voice log if a recording was made
        if (voiceAudioUrl && data.incident?.id) {
          import('../services/voiceService.js').then(({ saveVoiceLog }) => {
            saveVoiceLog(data.incident.id, voiceAudioUrl).catch(err =>
              console.warn('[IncidentForm] Voice log save failed:', err)
            );
          });
        }

        showNotification(i18n.t('incident_submitted') || '✓ Incident reported successfully', 'success');
        newForm.reset();
        gpsCoords = null;
        if (gpsStatus) {
          gpsStatus.textContent = '';
        }

        setTimeout(() => updateMainContent('incidents'), 1000);
      } catch (error) {
        console.error('[IncidentForm] Submit failed:', error);

        // Queue for offline sync
        queueOfflineEvent('incidents', payload);
        showNotification(i18n.t('incident_queued_offline'), 'error');
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = i18n.t('submit') || 'Submit';
      }
    });

    console.log('[TouristDashboard] Incident form initialized');
  }

  function generateQRCode() {
    console.log('[TouristDashboard] Generating QR code for user:', user.blockchainId);
    
    const qrEl = document.getElementById('qrCode');
    if (!qrEl) {
      console.warn('[TouristDashboard] QR code element not found');
      return;
    }
    
    // Clear existing QR code
    qrEl.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(qrEl, {
          text: JSON.stringify({ id: user.blockchainId, name: user.name }),
          width: 200,
          height: 200
        });
        console.log('[TouristDashboard] QR code generated successfully');
      } catch (error) {
        console.error('[TouristDashboard] QR code generation error:', error);
        qrEl.innerHTML = `<div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 8px;">QR Code: ${user.blockchainId}</div>`;
      }
    } else {
      console.warn('[TouristDashboard] QRCode library not loaded');
      qrEl.innerHTML = `<div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 8px; text-align: center; padding: 1rem;">
        <div>
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔗</div>
          <div style="font-size: 0.85rem; word-break: break-all;">${user.blockchainId}</div>
        </div>
      </div>`;
    }
  }

  return `
    <div class="dashboard">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">🛡️</div>
            <div>
              <h2>SafeTrip</h2>
            </div>
          </div>
        </div>

        <div class="sidebar-user">
          <div class="sidebar-avatar">${user.name?.charAt(0)?.toUpperCase() || 'T'}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.name}</div>
            <div class="sidebar-user-role">${i18n.t('tourist')}</div>
          </div>
        </div>
        
        <nav>
          <div class="nav-section-label">Navigation</div>
          <div class="nav-item active" data-view="home">
            <span class="nav-item-icon">🏠</span> ${i18n.t('home')}
          </div>
          <div class="nav-item" data-view="id">
            <span class="nav-item-icon">👤</span> ${i18n.t('profile')}
          </div>
          <div class="nav-item" data-view="incidents">
            <span class="nav-item-icon">📋</span> ${i18n.t('incidents')}
          </div>
          <div class="nav-item" data-view="settings">
            <span class="nav-item-icon">⚙️</span> ${i18n.t('settings')}
          </div>
        </nav>
      </aside>
      
      <main class="main-content" id="mainContent">
        ${getHomeView()}
      </main>
      
      <button id="sosButton" class="sos-button" aria-label="Emergency SOS">
        SOS
      </button>
    </div>
  `;
}
