// Socket.IO client service for real-time updates
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map(); // Track listeners for cleanup
  }

  connect() {
    if (this.socket && this.connected) {
      console.log('[Socket] Already connected');
      return this.socket;
    }

    console.log('[Socket] Connecting to server:', API_URL);
    
    this.socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventListeners();
    
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server:', this.socket.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Register user
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        this.registerUser(user);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    // Location updates
    this.socket.on('tourist:location:broadcast', (data) => {
      console.log('[Socket] Received tourist:location:broadcast:', data);
      window.dispatchEvent(new CustomEvent('socketLocationUpdate', { detail: data }));
    });
    
    // Location tracking stopped
    this.socket.on('tourist:location:stopped', (data) => {
      console.log('[Socket] Received tourist:location:stopped:', data);
      window.dispatchEvent(new CustomEvent('socketLocationStopped', { detail: data }));
    });

    // Incident notifications
    this.socket.on('incident:new', (data) => {
      console.log('[Socket] Received incident:new:', data);
      window.dispatchEvent(new CustomEvent('socketNewIncident', { detail: data }));
    });

    // SOS alerts
    this.socket.on('incident:sos:broadcast', (data) => {
      console.log('[Socket] Received incident:sos:broadcast:', data);
      window.dispatchEvent(new CustomEvent('socketSOSAlert', { detail: data }));
    });

    // User updates
    this.socket.on('users:update', (data) => {
      console.log('[Socket] Received users:update:', data);
      window.dispatchEvent(new CustomEvent('socketUsersUpdate', { detail: data }));
    });
  }

  registerUser(user) {
    if (!this.socket || !this.connected) {
      console.warn('[Socket] Cannot register user - not connected');
      return;
    }

    console.log('[Socket] Registering user:', user.id);
    this.socket.emit('user:register', {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      location: user.location || null
    });
  }

  updateLocation(userId, location, ackCallback) {
    if (!this.socket || !this.connected) {
      console.warn('[Socket] Cannot update location - not connected');
      return;
    }

    console.log('[Socket] Emitting tourist:location:update for user:', userId);
    
    if (typeof ackCallback === 'function') {
      // Emit with ACK — server calls ackCallback({ success, active })
      this.socket.emit('tourist:location:update', {
        userId,
        location,
        timestamp: new Date().toISOString()
      }, ackCallback);
    } else {
      this.socket.emit('tourist:location:update', {
        userId,
        location,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  stopTracking(userId) {
    if (!this.socket || !this.connected) {
      console.warn('[Socket] Cannot stop tracking - not connected');
      return;
    }

    console.log('[Socket] Emitting tourist:location:stop for user:', userId);
    this.socket.emit('tourist:location:stop', {
      userId,
      timestamp: new Date().toISOString()
    });
  }

  createIncident(incident) {
    if (!this.socket || !this.connected) {
      console.warn('[Socket] Cannot create incident - not connected');
      return;
    }

    console.log('[Socket] Emitting incident:create');
    this.socket.emit('incident:create', incident);
  }

  triggerSOS(data) {
    if (!this.socket || !this.connected) {
      console.warn('[Socket] Cannot trigger SOS - not connected');
      return;
    }

    console.log('[Socket] Emitting incident:sos:trigger');
    this.socket.emit('incident:sos:trigger', data);
  }

  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      
      // Remove all event listeners
      this.socket.removeAllListeners();
      
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
  
  cleanup() {
    console.log('[Socket] Cleaning up socket service...');
    this.disconnect();
  }

  isConnected() {
    return this.connected;
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
