// Location data service for state/city filtering
import { INDIAN_STATES, CITIES_BY_STATE } from '../constants/locations.js';

class LocationDataService {
  constructor() {
    this.states = [
      { id: 'all', name: 'All India', lat: 20.5937, lng: 78.9629, zoom: 5 },
      ...INDIAN_STATES.map(state => ({
        id: state.id,
        name: state.name,
        lat: state.lat,
        lng: state.lng,
        zoom: 7
      }))
    ];

    // Build cities map from CITIES_BY_STATE constants
    this.cities = {
      'all': [{ id: 'all', name: 'All Cities', lat: 20.5937, lng: 78.9629, zoom: 5 }]
    };

    INDIAN_STATES.forEach(state => {
      const cityNames = CITIES_BY_STATE[state.id] || [];
      this.cities[state.id] = [
        { id: 'all', name: `All ${state.name}`, lat: state.lat, lng: state.lng, zoom: 7 },
        ...cityNames.map(name => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          lat: state.lat,  // approximate — city-level coords can be added later
          lng: state.lng,
          zoom: 11
        }))
      ];
    });

    this.currentState = 'all';
    this.currentCity = 'all';
  }

  getStates() {
    return this.states;
  }

  getCities(stateId) {
    if (stateId === 'all') {
      return [{ id: 'all', name: 'All Cities', lat: 20.5937, lng: 78.9629, zoom: 5 }];
    }
    return this.cities[stateId] || [{ id: 'all', name: 'All Cities', lat: 20.5937, lng: 78.9629, zoom: 5 }];
  }

  getStateById(stateId) {
    return this.states.find(s => s.id === stateId) || this.states[0];
  }

  getCityById(stateId, cityId) {
    const cities = this.getCities(stateId);
    return cities.find(c => c.id === cityId) || cities[0];
  }

  setCurrentLocation(stateId, cityId) {
    this.currentState = stateId;
    this.currentCity = cityId;
    localStorage.setItem('selectedState', stateId);
    localStorage.setItem('selectedCity', cityId);
  }

  getCurrentLocation() {
    return {
      state: this.currentState,
      city: this.currentCity
    };
  }

  getLocationCoordinates(stateId, cityId) {
    if (cityId && cityId !== 'all') {
      const city = this.getCityById(stateId, cityId);
      return { lat: city.lat, lng: city.lng, zoom: city.zoom };
    } else if (stateId && stateId !== 'all') {
      const state = this.getStateById(stateId);
      return { lat: state.lat, lng: state.lng, zoom: state.zoom };
    }
    return { lat: 20.5937, lng: 78.9629, zoom: 5 }; // All India
  }

  filterUsersByLocation(users, stateId, cityId) {
    if (stateId === 'all') {
      return users;
    }

    return users.filter(user => {
      if (!user.location) return false;
      
      // Get state boundaries (simplified)
      const state = this.getStateById(stateId);
      const stateBounds = this.getStateBounds(stateId);
      
      const inState = user.location.lat >= stateBounds.minLat &&
                     user.location.lat <= stateBounds.maxLat &&
                     user.location.lng >= stateBounds.minLng &&
                     user.location.lng <= stateBounds.maxLng;
      
      if (!inState) return false;
      
      if (cityId === 'all') return true;
      
      // Check if in city (within 10km radius)
      const city = this.getCityById(stateId, cityId);
      const distance = this.calculateDistance(
        user.location.lat,
        user.location.lng,
        city.lat,
        city.lng
      );
      
      return distance <= 10000; // 10km radius
    });
  }

  getStateBounds(stateId) {
    // Get state from centralized constants
    const state = INDIAN_STATES.find(s => s.id === stateId);
    
    if (!state) {
      return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
    }
    
    // Create approximate bounds based on state center (±2 degrees)
    // In production, use proper GeoJSON boundaries
    return {
      minLat: state.lat - 2,
      maxLat: state.lat + 2,
      minLng: state.lng - 2,
      maxLng: state.lng + 2
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
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

  assignRandomLocation(user) {
    // Assign random location within a state for demo purposes
    const states = this.states.filter(s => s.id !== 'all');
    const randomState = states[Math.floor(Math.random() * states.length)];
    const cities = this.getCities(randomState.id).filter(c => c.id !== 'all');
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    
    // Add small random offset
    const lat = randomCity.lat + (Math.random() - 0.5) * 0.1;
    const lng = randomCity.lng + (Math.random() - 0.5) * 0.1;
    
    return {
      ...user,
      location: { lat, lng, timestamp: new Date().toISOString() },
      state: randomState.id,
      city: randomCity.id
    };
  }
}

export const locationDataService = new LocationDataService();
