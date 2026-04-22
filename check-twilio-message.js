/**
 * Check Twilio Message Status
 * Verifies if the SMS was actually sent and its delivery status
 */

require('dotenv').config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Message SIDs from recent tests
const messageSids = [
  'SMdecf1ce2af59106eefddf9918b3ca747', // From SOS test
  'SM1d56ad89a4dc2773936051d47d7bcfce'  // From initial test
];

async function checkMessageStatus(sid) {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${sid}.json`;
    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      console.error(`❌ Failed to fetch message ${sid}:`, error.message);
      return null;
    }
    
    const data = await res.json();
    return data;
    
  } catch (error) {
    console.error(`❌ Error checking message ${sid}:`, error.message);
    return null;
  }
}

async function checkAllMessages() {
  console.log('🔍 Checking Twilio Message Status...\n');
  
  for (const sid of messageSids) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📨 Message SID: ${sid}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const message = await checkMessageStatus(sid);
    
    if (message) {
      console.log('   To:', message.to);
      console.log('   From:', message.from);
      console.log('   Status:', message.status);
      console.log('   Direction:', message.direction);
      console.log('   Price:', message.price || 'Calculating...');
      console.log('   Error Code:', message.error_code || 'None');
      console.log('   Error Message:', message.error_message || 'None');
      console.log('   Date Created:', message.date_created);
      console.log('   Date Sent:', message.date_sent || 'Not sent yet');
      console.log('   Date Updated:', message.date_updated);
      
      // Status explanation
      console.log('\n   📊 Status Explanation:');
      switch (message.status) {
        case 'queued':
          console.log('      ⏳ Message is queued and will be sent shortly');
          break;
        case 'sending':
          console.log('      📤 Message is currently being sent');
          break;
        case 'sent':
          console.log('      ✅ Message was sent to carrier');
          break;
        case 'delivered':
          console.log('      ✅ Message was delivered to recipient');
          break;
        case 'undelivered':
          console.log('      ❌ Message failed to deliver');
          break;
        case 'failed':
          console.log('      ❌ Message failed to send');
          break;
        default:
          console.log('      ❓ Unknown status');
      }
      
      if (message.error_code) {
        console.log('\n   ⚠️  ERROR DETAILS:');
        console.log('      Code:', message.error_code);
        console.log('      Message:', message.error_message);
        console.log('      More info: https://www.twilio.com/docs/api/errors/' + message.error_code);
      }
    }
    
    console.log('');
  }
  
  // Check recent messages
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Fetching Recent Messages...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json?PageSize=5`;
    const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`\n   Found ${data.messages.length} recent messages:\n`);
      
      data.messages.forEach((msg, i) => {
        console.log(`   ${i + 1}. To: ${msg.to} | Status: ${msg.status} | Date: ${msg.date_created}`);
        console.log(`      SID: ${msg.sid}`);
        if (msg.error_code) {
          console.log(`      ❌ Error: ${msg.error_code} - ${msg.error_message}`);
        }
        console.log('');
      });
    }
  } catch (error) {
    console.error('   ❌ Failed to fetch recent messages:', error.message);
  }
}

checkAllMessages();
