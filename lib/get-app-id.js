const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const LIST_ID = 'F09LE31RB7F';

async function getAppAndTeamIds() {
  console.log('🔍 Getting App ID and Team ID for direct link...\n');
  
  try {
    const authResponse = await slackClient.auth.test();
    
    console.log('=== AUTH INFO ===');
    console.log(`Team: ${authResponse.team}`);
    console.log(`Team ID: ${authResponse.team_id}`);
    console.log(`User: ${authResponse.user}`);
    console.log(`User ID: ${authResponse.user_id}`);
    console.log(`App ID: ${authResponse.app_id || 'Not in response'}`);
    console.log(`URL: ${authResponse.url}`);
    
    console.log('\n=== DIRECT ACCESS URLS ===');
    console.log('\nTry these URLs in your browser (logged into Slack):\n');
    
    // Method 1: Standard app redirect
    console.log(`1. App redirect to list:`);
    console.log(`   https://slack.com/app_redirect?app=${authResponse.app_id || 'APP_ID'}&team=${authResponse.team_id}&list=${LIST_ID}\n`);
    
    // Method 2: Client link
    console.log(`2. Direct client link:`);
    console.log(`   https://app.slack.com/client/${authResponse.team_id}/browse-lists/${LIST_ID}\n`);
    
    // Method 3: Workspace URL
    console.log(`3. Workspace list link:`);
    const workspaceName = authResponse.url.replace('https://', '').replace('.slack.com/', '');
    console.log(`   https://${workspaceName}.slack.com/lists/${LIST_ID}\n`);
    
    // Method 4: Files browser (lists might be under files)
    console.log(`4. Try searching in Files:`);
    console.log(`   ${authResponse.url}files/all?query=${LIST_ID}\n`);
    
    console.log('\n=== IMPORTANT ===');
    console.log('⚠️  If NONE of these work, it likely means:');
    console.log('   1. Your workspace admin has Lists feature disabled');
    console.log('   2. Lists UI is not rolled out to your workspace yet');
    console.log('   3. Lists require Enterprise Grid plan (higher than Pro/Business)');
    console.log('\n💡 Recommendation:');
    console.log('   Contact your Slack workspace admin to check if Lists feature is enabled.');
    console.log('   Even if UI is not available, the API sync will work when it becomes available!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAppAndTeamIds();

