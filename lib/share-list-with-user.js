const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const LIST_ID = 'F09LE31RB7F';

async function shareListWithUser() {
  console.log('🔍 Attempting to share list with user...\n');
  
  try {
    // Get your user ID
    const authResponse = await slackClient.auth.test();
    console.log(`Your user ID: ${authResponse.user_id}`);
    console.log(`Bot user ID: ${authResponse.user_id}`);
    
    // Get all users to find your actual user account (not the bot)
    console.log('\nFinding workspace users...');
    const usersResponse = await slackClient.users.list({});
    
    console.log(`\nFound ${usersResponse.members.length} users. Looking for non-bot users...\n`);
    
    const realUsers = usersResponse.members.filter(u => 
      !u.is_bot && !u.deleted && u.id !== 'USLACKBOT'
    ).slice(0, 5);
    
    console.log('First 5 real users:');
    realUsers.forEach((u, idx) => {
      console.log(`  ${idx + 1}. ${u.real_name || u.name} (${u.id})`);
    });
    
    // Use the first real user (probably you)
    const targetUserId = realUsers[0].id;
    console.log(`\n🎯 Sharing list with: ${realUsers[0].real_name} (${targetUserId})`);
    
    // Share the list using slackLists.access.set
    console.log('\n📤 Setting list access...');
    const accessResponse = await slackClient.apiCall('slackLists.access.set', {
      list_id: LIST_ID,
      user_ids: [targetUserId],
      access_level: 'write' // Options: read, write, admin
    });
    
    if (accessResponse.ok) {
      console.log('✅ Successfully shared list with user!');
      console.log('\n📱 Now try:');
      console.log(`   1. Log out and log back into Slack`);
      console.log(`   2. Look for notifications about the new list`);
      console.log(`   3. Check "More" → "Lists"`);
      console.log(`   4. Try this URL: https://app.slack.com/client/T2G5B7NNL/browse-lists/${LIST_ID}`);
    } else {
      console.log('❌ Failed to share:', accessResponse.error);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

shareListWithUser();

