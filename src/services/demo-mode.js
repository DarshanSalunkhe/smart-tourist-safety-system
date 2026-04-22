// Demo Mode - Generate fake data for testing
class DemoModeService {
  constructor() {
    this.isActive = false;
    this.incidentIntervalId = null;
    this.policeIntervalId = null;
  }

  activate() {
    this.isActive = true;
    console.log('🎭 Demo Mode Activated');
    
    // Generate fake tourists
    this.generateFakeTourists(10);
    
    // Generate fake incidents periodically
    this.startIncidentSimulation();
    
    // Simulate police actions
    this.startPoliceSimulation();
  }

  deactivate() {
    this.isActive = false;
    
    // Clear incident simulation interval
    if (this.incidentIntervalId) {
      clearInterval(this.incidentIntervalId);
      this.incidentIntervalId = null;
    }
    
    // Clear police simulation interval
    if (this.policeIntervalId) {
      clearInterval(this.policeIntervalId);
      this.policeIntervalId = null;
    }
    
    console.log('🎭 Demo Mode Deactivated');
  }
  
  // Cleanup method to prevent memory leaks
  cleanup() {
    console.log('[DemoMode] Cleaning up demo mode service...');
    this.deactivate();
    console.log('[DemoMode] Cleanup complete');
  }

  generateFakeTourists(count) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const names = ['John Smith', 'Sarah Lee', 'Mike Chen', 'Emma Wilson', 'David Brown', 
                   'Lisa Garcia', 'Tom Anderson', 'Maria Rodriguez', 'James Taylor', 'Anna Kim'];
    
    for (let i = 0; i < count; i++) {
      const fakeTourist = {
        id: `demo-${Date.now()}-${i}`,
        name: names[i] || `Tourist ${i + 1}`,
        email: `tourist${i + 1}@demo.com`,
        password: 'demo123',
        phone: `+91-98765432${10 + i}`,
        emergencyContact: `+91-99999999${10 + i}`,
        role: 'tourist',
        blockchainId: `DID-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        verified: true,
        createdAt: new Date().toISOString(),
        location: this.getRandomLocation()
      };
      
      users.push(fakeTourist);
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    console.log(`✅ Generated ${count} fake tourists`);
  }

  getRandomLocation() {
    // Random location around Delhi (28.6139° N, 77.2090° E)
    const baseLat = 28.6139;
    const baseLng = 77.2090;
    const range = 0.05; // ~5km radius
    
    return {
      lat: baseLat + (Math.random() - 0.5) * range,
      lng: baseLng + (Math.random() - 0.5) * range
    };
  }

  startIncidentSimulation() {
    // Clear existing interval if any
    if (this.incidentIntervalId) {
      clearInterval(this.incidentIntervalId);
    }
    
    // Generate random incident every 30 seconds
    this.incidentIntervalId = setInterval(() => {
      if (!this.isActive) return;
      
      const types = ['theft', 'harassment', 'medical', 'lost', 'sos'];
      const severities = ['low', 'medium', 'high', 'critical'];
      const descriptions = {
        theft: 'Wallet stolen at market',
        harassment: 'Verbal harassment reported',
        medical: 'Tourist feeling unwell',
        lost: 'Lost in unfamiliar area',
        sos: 'Emergency panic button pressed'
      };
      
      const type = types[Math.floor(Math.random() * types.length)];
      const severity = type === 'sos' ? 'critical' : severities[Math.floor(Math.random() * severities.length)];
      
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const tourists = users.filter(u => u.role === 'tourist');
      const randomTourist = tourists[Math.floor(Math.random() * tourists.length)];
      
      if (randomTourist) {
        const incident = {
          id: `demo-inc-${Date.now()}`,
          userId: randomTourist.id,
          userName: randomTourist.name,
          type,
          severity,
          description: descriptions[type],
          location: this.getRandomLocation(),
          status: 'new',
          createdAt: new Date().toISOString(),
          responses: [],
          demo: true
        };
        
        const incidents = JSON.parse(localStorage.getItem('incidents') || '[]');
        incidents.push(incident);
        localStorage.setItem('incidents', JSON.stringify(incidents));
        
        // Trigger notification
        window.dispatchEvent(new CustomEvent('newIncident', { detail: incident }));
        
        console.log(`🚨 Demo Incident: ${type} (${severity})`);
      }
    }, 30000); // Every 30 seconds
  }

  startPoliceSimulation() {
    // Clear existing interval if any
    if (this.policeIntervalId) {
      clearInterval(this.policeIntervalId);
    }
    
    // Simulate police responding to incidents
    this.policeIntervalId = setInterval(() => {
      if (!this.isActive) return;
      
      const incidents = JSON.parse(localStorage.getItem('incidents') || '[]');
      const openIncidents = incidents.filter(i => i.status === 'new' && i.demo);
      
      if (openIncidents.length > 0) {
        const incident = openIncidents[Math.floor(Math.random() * openIncidents.length)];
        
        // Change status to in-progress
        incident.status = 'in-progress';
        incident.responses = incident.responses || [];
        incident.responses.push({
          officer: 'Officer Demo',
          message: 'Unit dispatched to location',
          timestamp: new Date().toISOString()
        });
        
        const index = incidents.findIndex(i => i.id === incident.id);
        incidents[index] = incident;
        localStorage.setItem('incidents', JSON.stringify(incidents));
        
        console.log(`👮 Demo Police: Responding to incident ${incident.id}`);
        
        // Resolve after some time
        setTimeout(() => {
          if (Math.random() > 0.5) {
            incident.status = 'resolved';
            incident.responses.push({
              officer: 'Officer Demo',
              message: 'Incident resolved successfully',
              timestamp: new Date().toISOString()
            });
            
            const idx = incidents.findIndex(i => i.id === incident.id);
            incidents[idx] = incident;
            localStorage.setItem('incidents', JSON.stringify(incidents));
            
            console.log(`✅ Demo Police: Resolved incident ${incident.id}`);
          }
        }, 15000); // Resolve after 15 seconds
      }
    }, 20000); // Check every 20 seconds
  }

  generateFakeRiskZones() {
    const zones = [
      { name: 'Demo High Crime Area', lat: 28.6129, lng: 77.2295, radius: 500, risk: 'high' },
      { name: 'Demo Unsafe Zone', lat: 28.6500, lng: 77.2167, radius: 300, risk: 'critical' },
      { name: 'Demo Caution Area', lat: 28.6200, lng: 77.2100, radius: 200, risk: 'medium' },
      { name: 'Demo Night Market', lat: 28.6350, lng: 77.2250, radius: 400, risk: 'medium' }
    ];
    
    localStorage.setItem('riskZones', JSON.stringify(zones));
    console.log('✅ Generated fake risk zones');
  }

  clearDemoData() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const realUsers = users.filter(u => !u.id.startsWith('demo-'));
    localStorage.setItem('users', JSON.stringify(realUsers));
    
    const incidents = JSON.parse(localStorage.getItem('incidents') || '[]');
    const realIncidents = incidents.filter(i => !i.demo);
    localStorage.setItem('incidents', JSON.stringify(realIncidents));
    
    console.log('🧹 Cleared demo data');
  }
}

export const demoModeService = new DemoModeService();
