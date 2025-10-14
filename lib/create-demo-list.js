const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function createDemoList() {
  console.log('🔍 Creating permanent demo bug board for you to view...\n');
  
  try {
    // Create the list
    console.log('📋 Creating "Asana Bug Board - DEMO"...');
    const createResponse = await slackClient.apiCall('slackLists.create', {
      name: 'Asana Bug Board - DEMO',
      description_blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: 'Demo list to verify Slack Lists API functionality. This list will NOT be deleted.'
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
              { value: 'fixed', label: 'Fixed', color: 'green' },
              { value: 'closed', label: 'Closed', color: 'gray' }
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
              { value: 'medium', label: 'Medium', color: 'yellow' },
              { value: 'high', label: 'High', color: 'orange' },
              { value: 'critical', label: 'Critical', color: 'red' }
            ]
          }
        }
      ]
    });
    
    const listId = createResponse.list_id;
    console.log(`✅ List created: ${listId}\n`);
    
    // Get column IDs
    const schema = createResponse.list_metadata.schema;
    const columns = {};
    schema.forEach(col => columns[col.key] = col.id);
    
    // Add sample bugs with different statuses
    console.log('📝 Adding sample bugs...\n');
    const sampleBugs = [
      { name: 'Login button not responsive on mobile', status: 'open', priority: 'critical' },
      { name: 'Image upload fails for files > 5MB', status: 'open', priority: 'high' },
      { name: 'Dashboard loading slowly', status: 'in_progress', priority: 'medium' },
      { name: 'Search results pagination broken', status: 'in_progress', priority: 'high' },
      { name: 'Typo in email notification', status: 'fixed', priority: 'low' },
      { name: 'Memory leak in analytics module', status: 'fixed', priority: 'critical' },
      { name: 'Old registration form issue', status: 'closed', priority: 'low' }
    ];
    
    for (const bug of sampleBugs) {
      await slackClient.apiCall('slackLists.items.create', {
        list_id: listId,
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
          { column_id: columns.status, select: [bug.status] },
          { column_id: columns.priority, select: [bug.priority] }
        ]
      });
      console.log(`  ✅ ${bug.name} [${bug.status.toUpperCase()}, ${bug.priority.toUpperCase()}]`);
    }
    
    console.log('\n\n=== ✅ SUCCESS ===');
    console.log(`\nList Name: "Asana Bug Board - DEMO"`);
    console.log(`List ID: ${listId}`);
    console.log(`Items: ${sampleBugs.length} sample bugs`);
    console.log('\n📱 How to view in Slack:');
    console.log('   1. Open Slack Desktop or Web App');
    console.log('   2. In the left sidebar, click "More" (three dots)');
    console.log('   3. Click "Lists"');
    console.log('   4. Look for "Asana Bug Board - DEMO"');
    console.log('   5. You should see all 7 bugs organized by their status!');
    console.log('\n💡 Try these URLs (may or may not work):');
    console.log(`   https://app.slack.com/client/T2G5B7NNL/browse-lists/${listId}`);
    console.log(`   https://doublemoose.slack.com/lists/${listId}`);
    console.log('\n🧹 This list will NOT be automatically deleted. Feel free to play with it!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) console.error('Details:', JSON.stringify(error.data, null, 2));
  }
}

createDemoList();

