/**
 * Update user phone number to verified Twilio number
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updatePhoneNumber() {
  try {
    console.log('🔄 Updating phone number to verified Twilio number...\n');
    
    // Update to the verified number from Twilio
    const result = await pool.query(
      `UPDATE users 
       SET phone = $1, emergency_contact = $2 
       WHERE email = $3 
       RETURNING id, name, email, phone, emergency_contact`,
      ['9912955971', '9912955971', 'darshansalunkhe7826@gmail.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ User updated successfully!\n');
      console.log('Updated user:');
      console.log('  Name:', result.rows[0].name);
      console.log('  Email:', result.rows[0].email);
      console.log('  Phone:', result.rows[0].phone, '→ Will become +919912955971');
      console.log('  Emergency Contact:', result.rows[0].emergency_contact, '→ Will become +919912955971');
      console.log('');
      console.log('✅ This number is verified in Twilio!');
      console.log('✅ SMS should now work when you click SOS button!');
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
  } finally {
    await pool.end();
  }
}

updatePhoneNumber();
