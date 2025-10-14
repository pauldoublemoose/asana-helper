const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testListWithShare() {
  console.log('🔍 Testing Slack List with channel sharing...\n');
  
  let testListId = null;
  
  try {
    // Step 1: Get your user ID (to send you a DM)
    console.log('📋 Step 1: Getting your user info...');
    const authResponse = await slackClient.auth.test();
    const botUserId = authResponse.user_id;
    console.log(`✅ Bot user ID: ${botUserId}`);
    
    // Step 2: Create a test list
    console.log('\n📋 Step 2: Creating test Slack List...');
    const createResponse = await slackClient.apiCall('slackLists.create', {
      name: 'Asana Bug Board Test',
      schema: [
        {
          key: 'bug_name',
          name: 'Bug Name',
          type: 'text',
          is_primary_column: true
        },
        {
          key: 'status',
          name: 'Status',
          type: 'select',
          options: {
            format: 'single_select',
            choices: [
              { value: 'open', label: 'Open', color: 'red' },
              { value: 'fixed', label: 'Fixed', color: 'green' }
            ]
          }
        }
      ]
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create list: ${createResponse.error}`);
    }
    
    testListId = createResponse.list_id;
    console.log(`✅ List created with ID: ${testListId}`);
    
    // Get column IDs
    const schema = createResponse.list_metadata.schema;
    const columns = {};
    schema.forEach(col => {
      columns[col.key] = col.id;
    });
    
    // Step 3: Add a sample item
    console.log('\n📝 Step 3: Adding sample bug...');
    const itemResponse = await slackClient.apiCall('slackLists.items.create', {
      list_id: testListId,
      initial_fields: [
        {
          column_id: columns.bug_name,
          rich_text: [
            {
              type: 'rich_text',
              elements: [
                {
                  type: 'rich_text_section',
                  elements: [
                    {
                      type: 'text',
                      text: 'Sample Bug: Login button not working'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          column_id: columns.status,
          select: ['open']
        }
      ]
    });
    
    console.log(`✅ Sample bug added!`);
    
    // Step 4: Try to post about the list to your DM
    console.log('\n💬 Step 4: Attempting to share list...');
    
    // Try method 1: Post a message mentioning the list
    try {
      const dmResponse = await slackClient.chat.postMessage({
        channel: botUserId,
        text: `🐛 Test Bug Board Created!\n\nList ID: ${testListId}\nThis list has 1 sample bug.`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🐛 Test Bug Board Created!'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `List ID: \`${testListId}\`\n\nI've created a test bug board with 1 sample item, but Slack Lists don't seem to be easily shareable via URL yet. You might need to find it in your Lists menu.`
            }
          }
        ]
      });
      console.log(`✅ Sent you a DM about the list!`);
    } catch (err) {
      console.log(`⚠️  Could not send DM: ${err.message}`);
      console.log('   Trying to find a public channel instead...');
      
      // Get list of channels
      const channelsResponse = await slackClient.conversations.list({
        types: 'public_channel',
        limit: 100
      });
      
      console.log('\n📢 Available channels:');
      channelsResponse.channels.slice(0, 10).forEach((ch, idx) => {
        console.log(`   ${idx + 1}. #${ch.name} (${ch.id})`);
      });
      
      console.log('\n💡 Please specify a channel in the .env file (SLACK_CHANNEL_ID) to share the list.');
    }
    
    console.log('\n\n=== RESULT ===');
    console.log(`✅ List Created: ${testListId}`);
    console.log(`✅ Sample Item Added`);
    console.log('\n⚠️  However: Slack Lists don\'t appear to be directly shareable via URL.');
    console.log('They may need to be accessed through:');
    console.log('  1. Slack Desktop/Web App → Click "More" → "Lists"');
    console.log('  2. Or they auto-appear when shared in a channel context');
    console.log('\nThe good news: The API works perfectly for creating and managing lists!');
    console.log('For the actual implementation, we\'ll create one main list and it should');
    console.log('appear in your workspace\'s Lists section.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

testListWithShare();

