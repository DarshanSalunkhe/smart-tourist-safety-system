/**
 * Twilio SMS Test Script
 * Tests if Twilio credentials are working
 */

require('dotenv').config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM;

console.log('🧪 Testing Twilio Configuration...\n');

// Check if credentials exist
console.log('📋 Configuration Check:');
console.log('  TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
console.log('  TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
console.log('  TWILIO_FROM:', TWILIO_FROM || '❌ Missing');
console.log('');

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

// Test Twilio API
async function testTwilio() {
  try {
    console.log('🔍 Testing Twilio API connection...\n');
    
    // First, verify account by fetching account details
    const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json`;
    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    console.log('📞 Verifying Twilio account...');
    const accountRes = await fetch(accountUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (!accountRes.ok) {
      const error = await accountRes.json();
      console.error('❌ Twilio Account Verification Failed:');
      console.error('   Status:', accountRes.status);
      console.error('   Error:', error.message || error);
      console.error('   Code:', error.code);
      
      if (accountRes.status === 401) {
        console.error('\n💡 This means your ACCOUNT_SID or AUTH_TOKEN is incorrect.');
        console.error('   Please verify your credentials at: https://console.twilio.com/');
      }
      return;
    }
    
    const accountData = await accountRes.json();
    console.log('✅ Account verified successfully!');
    console.log('   Account Name:', accountData.friendly_name);
    console.log('   Status:', accountData.status);
    console.log('   Type:', accountData.type);
    console.log('');
    
    // Verify the phone number
    console.log('📱 Verifying phone number:', TWILIO_FROM);
    const phoneUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    const phoneRes = await fetch(phoneUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (phoneRes.ok) {
      const phoneData = await phoneRes.json();
      const myPhone = phoneData.incoming_phone_numbers.find(p => p.phone_number === TWILIO_FROM);
      
      if (myPhone) {
        console.log('✅ Phone number verified!');
        console.log('   Number:', myPhone.phone_number);
        console.log('   Friendly Name:', myPhone.friendly_name);
        console.log('   Capabilities:', {
          SMS: myPhone.capabilities.sms ? '✅' : '❌',
          Voice: myPhone.capabilities.voice ? '✅' : '❌'
        });
      } else {
        console.warn('⚠️  Phone number not found in your account');
        console.warn('   Available numbers:', phoneData.incoming_phone_numbers.map(p => p.phone_number).join(', '));
      }
    }
    console.log('');
    
    // Ask for test phone number
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 To send a test SMS, run:');
    console.log('   node test-twilio.js +919876543210');
    console.log('   (Replace with your actual phone number)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Send test SMS if phone number provided
async function sendTestSMS(toNumber) {
  try {
    console.log(`\n📤 Sending test SMS to ${toNumber}...\n`);
    
    const message = '🧪 Test SMS from SafeTrip Companion. Your Twilio integration is working!';
    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const body = new URLSearchParams({
      To: toNumber,
      From: TWILIO_FROM,
      Body: message
    });
    
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      }
    );
    
    const data = await res.json();
    
    if (data.sid) {
      console.log('✅ SMS sent successfully!');
      console.log('   Message SID:', data.sid);
      console.log('   Status:', data.status);
      console.log('   To:', data.to);
      console.log('   From:', data.from);
      console.log('   Price:', data.price || 'Calculating...');
      console.log('\n💡 Check your phone for the test message!');
    } else {
      console.error('❌ SMS failed:');
      console.error('   Code:', data.code);
      console.error('   Message:', data.message);
      console.error('   More info:', data.more_info);
      
      if (data.code === 21211) {
        console.error('\n💡 Invalid "To" phone number. Make sure it includes country code (e.g., +919876543210)');
      } else if (data.code === 21608) {
        console.error('\n💡 The "From" number is not verified. For trial accounts, you can only send to verified numbers.');
        console.error('   Verify numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      }
    }
    
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
  }
}

// Main execution
const testPhoneNumber = process.argv[2];

if (testPhoneNumber) {
  sendTestSMS(testPhoneNumber);
} else {
  testTwilio();
}
