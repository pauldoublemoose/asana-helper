const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const LIST_ID = 'F09LE31RB7F';

async function checkListAccess() {
  console.log('🔍 Checking list access and visibility...\n');
  
  try {
    // 1. Verify list exists
    console.log('1. Verifying list exists by fetching items...');
    const itemsResponse = await slackClient.apiCall('slackLists.items.list', {
      list_id: LIST_ID
    });
    
    console.log(`✅ List exists with ${itemsResponse.items ? itemsResponse.items.length : 0} items`);
    
    // 2. Check if there's any metadata about sharing
    console.log('\n2. Checking list metadata...');
    console.log('Response keys:', Object.keys(itemsResponse));
    
    if (itemsResponse.list_metadata) {
      console.log('List metadata:', JSON.stringify(itemsResponse.list_metadata, null, 2));
    }
    
    // 3. Try to get your user info
    console.log('\n3. Getting your user info...');
    const authResponse = await slackClient.auth.test();
    console.log(`Your user ID: ${authResponse.user_id}`);
    console.log(`Your team: ${authResponse.team}`);
    
    // 4. Check if Slack has a "browse lists" conversation
    console.log('\n4. Looking for Lists in conversations...');
    try {
      const convos = await slackClient.conversations.list({
        types: 'public_channel,private_channel',
        limit: 20
      });
      
      const listsChannel = convos.channels.find(c => 
        c.name.includes('list') || c.purpose?.value.includes('list')
      );
      
      if (listsChannel) {
        console.log('Found lists-related channel:', listsChannel.name);
      } else {
        console.log('No lists-specific channel found');
      }
    } catch (err) {
      console.log('Could not list conversations:', err.message);
    }
    
    console.log('\n\n=== FINDINGS ===');
    console.log('The list exists and has data, but Slack Lists may require:');
    console.log('  1. Desktop/Web app (not available in mobile app yet)');
    console.log('  2. A paid Slack plan with Lists feature enabled');
    console.log('  3. Lists might only show in "More" menu if they\'ve been accessed before');
    console.log('\n💡 Alternative: Let me try posting a message WITH the list embedded...');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) console.error('Details:', JSON.stringify(error.data, null, 2));
  }
}

checkListAccess();

