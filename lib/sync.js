const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const SyncEngine = require('./sync-engine');

async function runSync() {
  console.log('🚀 Asana → Slack Bug Board Sync\n');
  console.log('================================\n');
  
  // Validate environment variables
  const requiredVars = [
    'ASANA_ACCESS_TOKEN',
    'ASANA_PROJECT_ID',
    'SLACK_BOT_TOKEN'
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
  
  const config = {
    asanaToken: process.env.ASANA_ACCESS_TOKEN,
    asanaProjectId: process.env.ASANA_PROJECT_ID,
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackUserToken: process.env.USER_TOKEN, // Optional
    slackListId: process.env.SLACK_LIST_ID || null // Will create if not exists
  };
  
  console.log('Configuration:');
  console.log(`  Asana Project: ${config.asanaProjectId}`);
  console.log(`  Slack List: ${config.slackListId || '(will create new)'}`);
  console.log(`  User Token: ${config.slackUserToken ? 'Yes' : 'No'}\n`);
  
  try {
    const syncEngine = new SyncEngine(config);
    const stats = await syncEngine.sync();
    
    // Update .env with list ID if it was created
    if (syncEngine.listId && !process.env.SLACK_LIST_ID) {
      console.log(`\n💡 Add this to your .env file:`);
      console.log(`SLACK_LIST_ID=${syncEngine.listId}`);
    }
    
    console.log('\n✅ Sync completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Sync failed:',error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSync();
}

module.exports = runSync;

