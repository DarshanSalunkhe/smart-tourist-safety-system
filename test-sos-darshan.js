/**
 * Test SOS Alert for DARSHAN SALUNKHE
 * Simulates the full SOS flow with SMS sending
 */

require('dotenv').config();
const { Pool } = require('pg');
const { sendSOSAlert } = require('./server/services/smsService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testSOSForDarshan() {
  console.log('🧪 Testing SOS Alert for DARSHAN SALUNKHE\n');
  
  try {
    // Fetch user data
    console.log('📋 Fetching user data...');
    const userResult = await pool.query(
      "SELECT * FROM users WHERE name = 'DARSHAN SALUNKHE'"
    );
    
    if (userResult.rows.length === 0) {
      console.error('❌ User "DARSHAN SALUNKHE" not found in database');
      await pool.end();
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Phone:', user.phone);
    console.log('   Emergency Contact:', user.emergency_contact);
    console.log('');
    
    // Simulate location (Hyderabad coordinates)
    const location = {
      lat: 17.4065,
      lng: 78.4772
    };
    
    console.log('📍 Test Location:');
    console.log('   Latitude:', location.lat);
    console.log('   Longitude:', location.lng);
    console.log('   Maps:', `https://maps.google.com/?q=${location.lat},${location.lng}`);
    console.log('');
    
    // Send SOS Alert
    console.log('🚨 Sending SOS Alert via Twilio...\n');
    const result = await sendSOSAlert(user, location, 'test-incident-' + Date.now());
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SOS Alert Result:');
    console.log('   Total Recipients:', result.total);
    console.log('   Successfully Sent:', result.sent);
    console.log('   Failed:', result.failed);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.sent > 0) {
      console.log('\n✅ SUCCESS! SMS sent via Twilio');
      console.log('💡 Check these phone numbers for SMS:');
      console.log('   1. Your phone: +91' + user.phone);
      console.log('   2. Emergency contact: +91' + user.emergency_contact);
    } else {
      console.log('\n❌ FAILED! No SMS sent');
      console.log('💡 Check backend logs for error details');
    }
    
    // Check SMS logs
    console.log('\n📝 Checking SMS logs...');
    const logsResult = await pool.query(
      `SELECT to_number, status, provider_id, error, created_at 
       FROM sms_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [user.id]
    );
    
    if (logsResult.rows.length > 0) {
      console.log('   Recent SMS logs:');
      logsResult.rows.forEach((log, i) => {
        console.log(`   ${i + 1}. To: ${log.to_number}`);
        console.log(`      Status: ${log.status}`);
        console.log(`      Provider ID: ${log.provider_id || 'N/A'}`);
        console.log(`      Error: ${log.error || 'None'}`);
        console.log(`      Time: ${log.created_at}`);
        console.log('');
      });
    } else {
      console.log('   No SMS logs found for this user');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n✅ Test complete');
  }
}

// Run test
testSOSForDarshan();
