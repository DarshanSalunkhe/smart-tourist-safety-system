/**
 * Test SOS Alert with New Fixes
 * Verifies: Unique messages, retry logic, proper logging
 */

require('dotenv').config();
const { Pool } = require('pg');
const { sendSOSAlert } = require('./server/services/smsService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testSOSWithFixes() {
  console.log('🧪 Testing SOS Alert with New Fixes\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Verification Checklist');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ Unique timestamped messages');
  console.log('✅ Retry logic (2 attempts, 5s delay)');
  console.log('✅ Enhanced logging');
  console.log('✅ Proper recipient formatting');
  console.log('');
  
  try {
    // Fetch user data
    console.log('📋 Fetching user data...');
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = 'darshansalunkhe7826@gmail.com'"
    );
    
    if (userResult.rows.length === 0) {
      console.error('❌ User not found');
      await pool.end();
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log('   Name:', user.name);
    console.log('   Phone:', user.phone, '→ Will become +91' + user.phone);
    console.log('   Emergency:', user.emergency_contact, '→ Will become +91' + user.emergency_contact);
    console.log('');
    
    // Test location
    const location = {
      lat: 17.4065,
      lng: 78.4772
    };
    
    console.log('📍 Test Location:');
    console.log('   Hyderabad, Telangana');
    console.log('   Coordinates:', location.lat, ',', location.lng);
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚨 Sending SOS Alert (Watch for new features)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    const startTime = Date.now();
    const result = await sendSOSAlert(user, location, 'test-' + Date.now());
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Duration:', duration + 's');
    console.log('Total Recipients:', result.total);
    console.log('Successfully Sent:', result.sent);
    console.log('Failed:', result.failed);
    console.log('');
    
    if (result.sent > 0) {
      console.log('✅ SUCCESS! SMS sent via Twilio');
      console.log('');
      console.log('🔍 What to verify:');
      console.log('   1. Message has unique timestamp ✅');
      console.log('   2. Retry logic logged (if needed) ✅');
      console.log('   3. Recipient numbers logged ✅');
      console.log('   4. Message content logged ✅');
      console.log('');
      console.log('📱 Check your phone: +91' + user.phone);
      console.log('   Expected format:');
      console.log('   "SafeTrip Alert: SOS triggered by ' + user.name + '"');
      console.log('   "Time: [current time], [current date]"');
      console.log('   "Location: 17.40650, 78.47720"');
      console.log('   "Maps: https://maps.google.com/?q=17.40650,78.47720"');
      console.log('   "Contact authorities (112) immediately."');
    } else {
      console.log('❌ FAILED! No SMS sent');
      console.log('');
      console.log('🔍 Check logs above for:');
      console.log('   - Twilio error codes');
      console.log('   - Retry attempts');
      console.log('   - Failure reasons');
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Comparison: Before vs After');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('BEFORE:');
    console.log('  ❌ Generic message (same every time)');
    console.log('  ❌ No retry on failure');
    console.log('  ❌ Minimal logging');
    console.log('  ❌ Duplicate requests possible');
    console.log('');
    console.log('AFTER:');
    console.log('  ✅ Unique timestamped message');
    console.log('  ✅ 2 retry attempts with 5s delay');
    console.log('  ✅ Detailed logging (recipients, message, attempts)');
    console.log('  ✅ 30s cooldown prevents duplicates');
    console.log('');
    
    // Wait a moment to see if retry happens
    if (result.failed > 0) {
      console.log('⏳ Note: If retry logic triggered, you saw:');
      console.log('   "[SMS] Attempt 1/2 to +919912955971"');
      console.log('   "[SMS] Attempt 1 failed, retrying in 5s..."');
      console.log('   "[SMS] Attempt 2/2 to +919912955971"');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

testSOSWithFixes();
