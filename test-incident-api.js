/**
 * Test Incident API Endpoint
 * Simulates what the frontend does when SOS button is clicked
 */

require('dotenv').config();

const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';

async function testIncidentAPI() {
  console.log('🧪 Testing Incident API Endpoint\n');
  console.log('API URL:', API_URL);
  console.log('');
  
  // Simulate SOS incident creation (what frontend does)
  const incidentData = {
    userId: 'google-1775721763894', // DARSHAN SALUNKHE
    type: 'sos',
    description: 'Emergency SOS Alert from button test',
    severity: 'critical',
    location: {
      lat: 17.4065,
      lng: 78.4772,
      state: 'Telangana',
      city: 'Hyderabad'
    },
    method: 'button'
  };
  
  console.log('📤 Sending POST request to /api/incidents');
  console.log('   Data:', JSON.stringify(incidentData, null, 2));
  console.log('');
  
  try {
    const response = await fetch(`${API_URL}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(incidentData)
    });
    
    console.log('📥 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', error);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 SUCCESS! Incident created');
      console.log('   Incident ID:', data.incident.id);
      console.log('   Type:', data.incident.type);
      console.log('   Severity:', data.incident.severity);
      console.log('');
      console.log('💡 Check backend logs for SMS sending confirmation');
      console.log('💡 Check your phone (+919912955971) for SMS');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('');
    console.error('💡 Possible issues:');
    console.error('   1. Backend server not running (npm run server)');
    console.error('   2. Wrong API URL in .env (VITE_API_URL)');
    console.error('   3. CORS issue');
    console.error('   4. Network error');
  }
}

testIncidentAPI();
