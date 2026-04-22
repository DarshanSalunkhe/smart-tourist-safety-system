class LocationService {
  constructor() {
    this.tracking = false;
    this.watchId = null;
    this.currentLocation = null;
    this.lastLocation = null;
    this.lastMovementTime = Date.now();
    this.listeners = [];
    this.offlineMode = false;
    this.locationHistory = [];
    this.updateInterval = null;
    
    // Bind handlers for proper cleanup
    this.handleOnlineEvent = () => this.handleOnline();
    this.handleOfflineEvent = () => this.handleOffline();
    
    // Check online status
    window.addEventListener('online', this.handleOnlineEvent);
    window.addEventListener('offline', this.handleOfflineEvent);
  }
  
  // Cleanup method to prevent memory leaks
  cleanup() {
    console.log('[Location] Cleaning up location service...');
    
    // Stop tracking
    this.stopTracking();
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnlineEvent);
    window.removeEventListener('offline', this.handleOfflineEvent);
    
    // Clear listeners array
    this.listeners = [];
    
    console.log('[Location] Cleanup complete');
  }

  startTracking() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    this.tracking = true;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastLocation = this.currentLocation;
        this.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy
        };
        
        // Save to offline storage
        this.saveOfflineLocation();
        
        // Update user location in localStorage
        this.updateUserLocation();
        
        // Add to history
        this.locationHistory.push(this.currentLocation);
        if (this.locationHistory.length > 50) this.locationHistory.shift();
        
        this.notifyListeners();
        this.checkGeofences();
        this.checkMovement();
        this.checkRouteDeviation();
        
        console.log('📍 Location updated:', this.currentLocation);
      },
      (error) => {
        console.error('Location error:', error);
        // Use mock location for demo
        this.useMockLocation();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    
    // Also start periodic updates for demo purposes
    this.startPeriodicUpdates();
  }
  
  startPeriodicUpdates() {
    // Update location every 10 seconds for demo
    this.updateInterval = setInterval(() => {
      if (this.tracking && this.currentLocation) {
        // Simulate small movement
        const newLat = this.currentLocation.lat + (Math.random() - 0.5) * 0.001;
        const newLng = this.currentLocation.lng + (Math.random() - 0.5) * 0.001;
        
        this.currentLocation = {
          lat: newLat,
          lng: newLng,
          timestamp: new Date().toISOString(),
          accuracy: 10
        };
        
        this.saveOfflineLocation();
        this.updateUserLocation();
        this.notifyListeners();
        
        console.log('📍 Location updated (periodic):', this.currentLocation);
      }
    }, 10000); // Every 10 seconds
  }
  
  useMockLocation() {
    // Use Delhi area with random offset for demo
    const baseLat = 28.6139;
    const baseLng = 77.2090;
    
    this.currentLocation = {
      lat: baseLat + (Math.random() - 0.5) * 0.05,
      lng: baseLng + (Math.random() - 0.5) * 0.05,
      timestamp: new Date().toISOString(),
      accuracy: 50,
      mock: true
    };
    
    this.saveOfflineLocation();
    this.updateUserLocation();
    this.notifyListeners();
  }
  
  updateUserLocation() {
    // Update current user's location in localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && this.currentLocation) {
      user.location = this.currentLocation;
      localStorage.setItem('user', JSON.stringify(user));
      
      // Also update in users array
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].location = this.currentLocation;
        users[userIndex].lastSeen = new Date().toISOString();
        localStorage.setItem('users', JSON.stringify(users));
      }
      
      // Send to backend via Socket.IO with ACK callback
      import('./socket.js').then(({ socketService }) => {
        if (socketService.isConnected()) {
          socketService.updateLocation(user.id, this.currentLocation, (ack) => {
            if (ack?.success) {
              console.log('[Location] Server confirmed location_active=true for:', user.id);
              // Fire event so dashboard can do a final UI confirmation if needed
              window.dispatchEvent(new CustomEvent('trackingConfirmed', {
                detail: { userId: user.id, active: true }
              }));
            } else {
              console.warn('[Location] Server ACK failed:', ack?.error);
            }
          });
        }
      }).catch(err => {
        console.warn('[Location] Socket.IO not available:', err);
      });
      
      // Trigger event for real-time updates (fallback)
      window.dispatchEvent(new CustomEvent('locationUpdate', {
        detail: { userId: user.id, location: this.currentLocation }
      }));
    }
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.tracking = false;
    
    // Notify backend that tracking stopped
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
      import('./socket.js').then(({ socketService }) => {
        if (socketService.isConnected()) {
          console.log('[Location] Calling socketService.stopTracking for user:', user.id);
          socketService.stopTracking(user.id);
        }
      }).catch(err => {
        console.warn('[Location] Socket.IO not available:', err);
      });
    }
    
    console.log('📍 Location tracking stopped');
  }

  getCurrentLocation() {
    return this.currentLocation;
  }

  getLastSavedLocation() {
    const saved = localStorage.getItem('lastKnownLocation');
    return saved ? JSON.parse(saved) : null;
  }

  saveOfflineLocation() {
    if (this.currentLocation) {
      localStorage.setItem('lastKnownLocation', JSON.stringify(this.currentLocation));
    }
  }

  handleOffline() {
    this.offlineMode = true;
    this.triggerAlert('offline', 'You are offline. Emergency mode activated.');
  }

  handleOnline() {
    if (this.offlineMode) {
      this.offlineMode = false;
      this.triggerAlert('online', 'Connection restored.');
    }
  }

  isOffline() {
    return !navigator.onLine || this.offlineMode;
  }

  // Enhanced: Check for no movement (30+ minutes)
  checkMovement() {
    if (!this.lastLocation || !this.currentLocation) return;

    const distance = this.calculateDistance(
      this.lastLocation.lat,
      this.lastLocation.lng,
      this.currentLocation.lat,
      this.currentLocation.lng
    );

    // If moved less than 10 meters
    if (distance < 10) {
      const timeSinceMovement = Date.now() - this.lastMovementTime;
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (timeSinceMovement > thirtyMinutes) {
        this.triggerAlert('no_movement', '⚠️ No movement detected for 30+ minutes. Are you okay?', 'high');
      }
    } else {
      this.lastMovementTime = Date.now();
    }
  }

  // Enhanced: Check for sudden route deviation
  checkRouteDeviation() {
    if (this.locationHistory.length < 5) return;

    const recent = this.locationHistory.slice(-5);
    const avgLat = recent.reduce((sum, loc) => sum + loc.lat, 0) / recent.length;
    const avgLng = recent.reduce((sum, loc) => sum + loc.lng, 0) / recent.length;

    const currentDist = this.calculateDistance(
      this.currentLocation.lat,
      this.currentLocation.lng,
      avgLat,
      avgLng
    );

    // If deviated more than 500 meters from average path
    if (currentDist > 500) {
      this.triggerAlert('route_deviation', '⚠️ Sudden route deviation detected', 'medium');
    }
  }

  onLocationUpdate(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentLocation));
  }

  // Enhanced: Check geofences with risk level alerts
  checkGeofences() {
    const riskZones = JSON.parse(localStorage.getItem('riskZones') || '[]');
    
    if (!this.currentLocation) return;

    riskZones.forEach(zone => {
      const distance = this.calculateDistance(
        this.currentLocation.lat,
        this.currentLocation.lng,
        zone.lat,
        zone.lng
      );

      if (distance < zone.radius) {
        const severity = zone.risk === 'critical' ? 'critical' : zone.risk === 'high' ? 'high' : 'medium';
        this.triggerAlert('geofence', `🚨 Entering ${zone.risk} risk zone: ${zone.name}`, severity);
      }
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  triggerAlert(type, message, severity = 'medium') {
    const event = new CustomEvent('safetyAlert', {
      detail: { type, message, severity, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
  }
  
  // Cleanup method to prevent memory leaks
  cleanup() {
    console.log('[Location] Cleaning up location service...');
    
    // Stop tracking (clears watchId and updateInterval)
    this.stopTracking();
    
    // Remove event listeners
    if (this.handleOnlineEvent) {
      window.removeEventListener('online', this.handleOnlineEvent);
    }
    if (this.handleOfflineEvent) {
      window.removeEventListener('offline', this.handleOfflineEvent);
    }
    
    // Clear listeners array
    this.listeners = [];
    
    console.log('[Location] Cleanup complete');
  }
}

export const locationService = new LocationService();
