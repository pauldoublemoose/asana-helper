const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function shareListToChannel() {
  console.log('🔍 Creating and sharing list to #bot-dev...\n');
  
  let testListId = null;
  
  try {
    // Step 1: Find the bot-dev channel
    console.log('📋 Step 1: Finding #bot-dev channel...');
    const channelsResponse = await slackClient.conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000
    });
    
    const botDevChannel = channelsResponse.channels.find(ch => ch.name === 'bot-dev');
    
    if (!botDevChannel) {
      throw new Error('Could not find #bot-dev channel');
    }
    
    console.log(`✅ Found #bot-dev: ${botDevChannel.id}`);
    const channelId = botDevChannel.id;
    
    // Step 2: Create a test list
    console.log('\n📋 Step 2: Creating Asana Bug Board Test List...');
    const createResponse = await slackClient.apiCall('slackLists.create', {
      name: 'Asana Bug Board - Test',
      description_blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: 'Test sync from Asana QA Board'
                }
              ]
            }
          ]
        }
      ],
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
              { value: 'in_progress', label: 'In Progress', color: 'yellow' },
              { value: 'fixed', label: 'Fixed', color: 'green' }
            ]
          }
        },
        {
          key: 'priority',
          name: 'Priority',
          type: 'select',
          options: {
            format: 'single_select',
            choices: [
              { value: 'low', label: 'Low', color: 'green' },
              { value: 'high', label: 'High', color: 'red' }
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
    
    // Step 3: Add sample bugs
    console.log('\n📝 Step 3: Adding sample bugs...');
    
    const sampleBugs = [
      { name: 'Login button not responsive', status: 'open', priority: 'high' },
      { name: 'Image upload fails on mobile', status: 'in_progress', priority: 'high' },
      { name: 'Typo in header text', status: 'fixed', priority: 'low' }
    ];
    
    for (const bug of sampleBugs) {
      await slackClient.apiCall('slackLists.items.create', {
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
                    elements: [{ type: 'text', text: bug.name }]
                  }
                ]
              }
            ]
          },
          {
            column_id: columns.status,
            select: [bug.status]
          },
          {
            column_id: columns.priority,
            select: [bug.priority]
          }
        ]
      });
      console.log(`  ✅ Added: ${bug.name}`);
    }
    
    // Step 4: Post to #bot-dev
    console.log('\n💬 Step 4: Posting to #bot-dev...');
    
    const messageResponse = await slackClient.chat.postMessage({
      channel: channelId,
      text: `🐛 Asana Bug Board Test Created! List ID: ${testListId}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🐛 Asana Bug Board - Test',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `I've created a test bug board with 3 sample items:\n• Login button not responsive (Open, High)\n• Image upload fails on mobile (In Progress, High)\n• Typo in header text (Fixed, Low)`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*List ID:*\n\`${testListId}\``
            },
            {
              type: 'mrkdwn',
              text: '*Items:*\n3 bugs'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 To view this list, look in your Slack sidebar under "More" → "Lists" or search for "Asana Bug Board - Test"'
            }
          ]
        }
      ]
    });
    
    console.log(`✅ Posted to #bot-dev!`);
    console.log(`   Message timestamp: ${messageResponse.ts}`);
    
    console.log('\n\n=== SUCCESS ===');
    console.log(`✅ List ID: ${testListId}`);
    console.log(`✅ Posted to #bot-dev channel`);
    console.log(`✅ 3 sample bugs added`);
    console.log('\n📱 Check your Slack workspace:');
    console.log('   1. Go to #bot-dev channel to see the message');
    console.log('   2. Click "More" in sidebar → "Lists" to find the list');
    console.log('   3. Search for "Asana Bug Board - Test"');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

shareListToChannel();

