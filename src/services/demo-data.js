// Initialize demo data for the application
export function initializeDemoData() {
  // Check if already initialized
  if (localStorage.getItem('demoInitialized')) {
    return;
  }

  // Demo users
  const users = [
    {
      id: '1',
      name: 'Tourist Demo',
      email: 'tourist@demo.com',
      password: 'demo123',
      phone: '+91-9876543210',
      emergencyContact: '+91-9999999999',
      role: 'tourist',
      blockchainId: 'BLK-TOU123ABC',
      verified: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Officer Smith',
      email: 'authority@demo.com',
      password: 'demo123',
      phone: '+91-9876543211',
      emergencyContact: '+91-9999999998',
      role: 'authority',
      blockchainId: 'BLK-AUTH456DEF',
      verified: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Admin User',
      email: 'admin@demo.com',
      password: 'demo123',
      phone: '+91-9876543212',
      emergencyContact: '+91-9999999997',
      role: 'admin',
      blockchainId: 'BLK-ADM789GHI',
      verified: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Demo risk zones
  const riskZones = [
    {
      name: 'High Crime Area - Old Market',
      lat: 28.6129,
      lng: 77.2295,
      radius: 500,
      risk: 'high'
    },
    {
      name: 'Unsafe Zone - Industrial Area',
      lat: 28.6500,
      lng: 77.2167,
      radius: 300,
      risk: 'critical'
    },
    {
      name: 'Caution Area - Night Market',
      lat: 28.6200,
      lng: 77.2100,
      radius: 200,
      risk: 'medium'
    }
  ];

  // Demo incidents
  const incidents = [
    {
      id: '1001',
      userId: '1',
      type: 'theft',
      severity: 'high',
      description: 'Wallet stolen at tourist market',
      location: { lat: 28.6139, lng: 77.2090 },
      status: 'open',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      responses: [
        {
          officer: 'Officer Smith',
          message: 'Unit dispatched to location',
          timestamp: new Date(Date.now() - 3000000).toISOString()
        }
      ]
    },
    {
      id: '1002',
      userId: '1',
      type: 'medical',
      severity: 'medium',
      description: 'Minor injury - first aid needed',
      location: { lat: 28.6200, lng: 77.2100 },
      status: 'resolved',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      responses: [
        {
          officer: 'Officer Johnson',
          message: 'First aid provided, tourist is safe',
          timestamp: new Date(Date.now() - 6000000).toISOString()
        }
      ]
    }
  ];

  // Save to localStorage
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('riskZones', JSON.stringify(riskZones));
  localStorage.setItem('incidents', JSON.stringify(incidents));
  localStorage.setItem('demoInitialized', 'true');

  console.log('✅ Demo data initialized');
}

// Reset demo data
export function resetDemoData() {
  localStorage.removeItem('users');
  localStorage.removeItem('riskZones');
  localStorage.removeItem('incidents');
  localStorage.removeItem('demoInitialized');
  localStorage.removeItem('user');
  
  initializeDemoData();
  
  console.log('🔄 Demo data reset');
}
