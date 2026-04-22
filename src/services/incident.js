class IncidentService {
  constructor() {
    this.incidents = [];
    this.cachedIncidents = [];
    this.lastFetch = null;
    this._base = import.meta.env?.VITE_API_URL || 'http://localhost:5000';
  }

  async fetchIncidents(filter = {}) {
    try {
      const params = new URLSearchParams();
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.status) params.append('status', filter.status);
      if (filter.state) params.append('state', filter.state);
      if (filter.city) params.append('city', filter.city);
      
      const url = `${this._base}/api/incidents${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[IncidentService] Fetching incidents from:', url);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.cachedIncidents = data.incidents || [];
        this.lastFetch = Date.now();
        // Cache for risk engine
        localStorage.setItem('cachedIncidents', JSON.stringify(this.cachedIncidents));
        console.log('[IncidentService] Incidents fetched:', this.cachedIncidents.length);
        return this.cachedIncidents;
      } else {
        console.error('[IncidentService] Failed to fetch incidents:', response.status);
        return this.cachedIncidents; // Return cached data on error
      }
    } catch (error) {
      console.error('[IncidentService] Error fetching incidents:', error);
      return this.cachedIncidents; // Return cached data on error
    }
  }

  async createIncident(data) {
    const incident = {
      userId: data.userId,
      type: data.type,
      description: data.description || '',
      severity: data.severity,
      location: data.location || null,
      method: data.method || 'manual'
    };

    try {
      const response = await fetch(`${this._base}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(incident)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[IncidentService] Incident created:', result.incident);
        
        // Trigger real-time notification
        this.notifyAuthorities(result.incident);
        
        // Refresh cached incidents
        await this.fetchIncidents();
        
        return result.incident;
      } else {
        console.error('[IncidentService] Failed to create incident:', response.status);
        return null;
      }
    } catch (error) {
      console.error('[IncidentService] Error creating incident:', error);
      return null;
    }
  }

  async triggerSOS(userId, location, method = 'button') {
    const incident = await this.createIncident({
      userId,
      type: 'sos',
      severity: 'critical',
      location: location || this.getLastKnownLocation(),
      description: `🚨 EMERGENCY SOS ALERT - Triggered via ${method}`,
      method
    });

    if (!incident) {
      console.error('[IncidentService] Failed to create SOS incident');
      return null;
    }

    // Send SMS if offline
    if (!navigator.onLine) {
      this.sendOfflineSOS(incident);
    }
    
    // Play alert sound (if available)
    this.playAlertSound();
    
    // Show visual alert
    this.showSOSAlert();
    
    // Notify all authorities
    this.notifyAllAuthorities(incident);
    
    console.log('🚨 SOS TRIGGERED:', incident);

    return incident;
  }
  
  getLastKnownLocation() {
    const saved = localStorage.getItem('lastKnownLocation');
    if (saved) {
      return JSON.parse(saved);
    }
    // Return default Delhi location if no location available
    return {
      lat: 28.6139,
      lng: 77.2090,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }
  
  playAlertSound() {
    try {
      // Create audio context for alert sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  }
  
  showSOSAlert() {
    const alert = document.createElement('div');
    alert.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ef4444;
      color: white;
      padding: 3rem;
      border-radius: 1rem;
      font-size: 2rem;
      font-weight: bold;
      z-index: 99999;
      box-shadow: 0 20px 60px rgba(239, 68, 68, 0.5);
      animation: sosFlash 0.5s ease-in-out 3;
      text-align: center;
      min-width: 300px;
    `;
    alert.innerHTML = `
      <div style="font-size: 4rem; margin-bottom: 1rem;">🚨</div>
      <div>SOS ACTIVATED</div>
      <div style="font-size: 1rem; margin-top: 1rem; font-weight: normal;">
        Authorities have been notified
      </div>
    `;
    
    // Add flash animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes sosFlash {
        0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.style.animation = 'fadeOut 0.5s ease';
      setTimeout(() => alert.remove(), 500);
    }, 3000);
  }
  
  notifyAllAuthorities(incident) {
    // Create high-priority notification for authorities
    const notification = {
      id: Date.now().toString(),
      type: 'sos',
      severity: 'critical',
      incident: incident,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Store in notifications
    const notifications = JSON.parse(localStorage.getItem('authorityNotifications') || '[]');
    notifications.unshift(notification);
    localStorage.setItem('authorityNotifications', JSON.stringify(notifications));
    
    // Trigger real-time event
    window.dispatchEvent(new CustomEvent('sosAlert', { detail: incident }));
  }

  sendOfflineSOS(incident) {
    console.log('📱 Offline SOS queued for sync');
    // Use unified offline queue (offlineSyncService) via localStorage key
    const QUEUE_KEY = 'offlineQueue';
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({
      type: 'incidents',
      payload: {
        userId: incident.userId || incident.user_id,
        type: 'sos',
        description: incident.description || 'Emergency SOS Alert (offline)',
        severity: 'critical',
        location: incident.location,
        method: 'button'
      },
      createdAt: Date.now()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  getIncidents(filter = {}) {
    // Return cached incidents synchronously
    // Dashboards should call fetchIncidents() first to populate cache
    let filtered = [...this.cachedIncidents];

    if (filter.userId) {
      filtered = filtered.filter(i => i.user_id === filter.userId);
    }

    if (filter.status) {
      filtered = filtered.filter(i => i.status === filter.status);
    }

    return filtered.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  }

  updateIncident(id, updates) {
    const index = this.cachedIncidents.findIndex(i => i.id === id);
    if (index !== -1) {
      this.cachedIncidents[index] = { 
        ...this.cachedIncidents[index], 
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Notify status change
      if (updates.status) {
        this.notifyStatusChange(this.cachedIncidents[index]);
      }
    }
  }

  // Enhanced: Change status workflow
  changeStatus(id, newStatus, officer) {
    const validTransitions = {
      'new': ['in-progress', 'resolved'],
      'in-progress': ['resolved'],
      'resolved': []
    };

    const incident = this.cachedIncidents.find(i => i.id === id);
    if (!incident) return false;

    if (!validTransitions[incident.status]?.includes(newStatus)) {
      alert(`Cannot change status from ${incident.status} to ${newStatus}`);
      return false;
    }

    this.updateIncident(id, { 
      status: newStatus,
      lastOfficer: officer
    });

    this.addResponse(id, {
      officer,
      message: `Status changed to ${newStatus}`,
      action: 'status_change'
    });

    return true;
  }

  addResponse(incidentId, response) {
    const incident = this.cachedIncidents.find(i => i.id === incidentId);
    if (incident) {
      if (!incident.responses) incident.responses = [];
      incident.responses.push({
        ...response,
        timestamp: new Date().toISOString()
      });
    }
  }

  notifyAuthorities(incident) {
    const event = new CustomEvent('newIncident', { detail: incident });
    window.dispatchEvent(event);
    
    // Show push-style notification
    this.showNotification(
      `🚨 New ${incident.severity} incident: ${incident.type}`,
      incident.severity === 'critical' ? 'error' : 'warning'
    );
  }

  notifyStatusChange(incident) {
    const event = new CustomEvent('incidentStatusChange', { detail: incident });
    window.dispatchEvent(event);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
  }

  // Analytics
  getStats() {
    return {
      total: this.cachedIncidents.length,
      new: this.cachedIncidents.filter(i => i.status === 'new').length,
      inProgress: this.cachedIncidents.filter(i => i.status === 'in-progress').length,
      resolved: this.cachedIncidents.filter(i => i.status === 'resolved').length,
      sos: this.cachedIncidents.filter(i => i.type === 'sos').length,
      critical: this.cachedIncidents.filter(i => i.severity === 'critical').length
    };
  }
}

export const incidentService = new IncidentService();
