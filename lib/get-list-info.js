const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const TEST_LIST_ID = 'F09L208MUUF';

async function getListInfo() {
  console.log('🔍 Getting list information...\n');
  
  try {
    // Try to get list details
    console.log(`List ID: ${TEST_LIST_ID}\n`);
    
    // Construct possible URLs
    const teamId = 'T2G5B7NNL'; // From your webhook URL
    
    console.log('Possible ways to access the list:\n');
    console.log(`1. Direct List URL (try these):`);
    console.log(`   https://app.slack.com/client/${teamId}/browse-lists/${TEST_LIST_ID}`);
    console.log(`   https://slack.com/app_redirect?channel=${TEST_LIST_ID}`);
    console.log(`   https://doublemoose.slack.com/lists/${TEST_LIST_ID}`);
    
    // Try to list all accessible lists
    console.log('\n2. Attempting to list all lists in workspace...');
    try {
      // There's no documented method to list all lists, but let's try
      const response = await slackClient.apiCall('conversations.list', {
        types: 'public_channel,private_channel',
        limit: 1000
      });
      
      console.log(`\nFound ${response.channels.length} channels/conversations`);
      
      // Look for the list in conversations
      const listConvo = response.channels.find(c => c.id === TEST_LIST_ID);
      if (listConvo) {
        console.log('\n✅ Found the list in conversations!');
        console.log(JSON.stringify(listConvo, null, 2));
      } else {
        console.log('\n⚠️  List not found in conversations list');
      }
    } catch (err) {
      console.log('Could not list conversations:', err.message);
    }
    
    // Try to get list items to verify it exists
    console.log('\n3. Verifying list exists by fetching items...');
    const listResponse = await slackClient.apiCall('slackLists.items.list', {
      list_id: TEST_LIST_ID
    });
    
    if (listResponse.ok) {
      console.log(`✅ List exists! It has ${listResponse.items ? listResponse.items.length : 0} items`);
    }
    
    // Try to share to a channel
    console.log('\n4. Would you like to share this list to a channel?');
    console.log('   We can use chat.postMessage to post a link to it.');
    console.log('   Or use conversations.join if it\'s a channel-like entity.');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

getListInfo();

