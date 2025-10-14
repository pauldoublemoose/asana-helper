const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { WebClient } = require('@slack/web-api');

// Debug: Check token
console.log('Loading .env from:', path.join(__dirname, '.env'));
console.log('Bot token loaded:', process.env.SLACK_BOT_TOKEN ? process.env.SLACK_BOT_TOKEN.substring(0, 30) + '...' : 'NOT FOUND');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testSlackListAPI() {
  console.log('🔍 Testing Slack Lists API...\n');
  
  let testListId = null;
  
  try {
    // Step 1: Create a test list with simplified schema
    console.log('📋 Step 1: Creating test Slack List...');
    const createResponse = await slackClient.apiCall('slackLists.create', {
      name: 'Bug Board Test',
      description_blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: 'Test list to verify Slack Lists API functionality'
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
    const schema = createResponse.list_metadata.schema;
    
    console.log(`✅ List created successfully!`);
    console.log(`   List ID: ${testListId}`);
    console.log(`   Columns: ${schema.length}`);
    console.log('\n   Column Details:');
    schema.forEach(col => {
      console.log(`     - ${col.name} (${col.type}) [ID: ${col.id}]`);
    });
    
    // Store column IDs for item creation
    const columns = {};
    schema.forEach(col => {
      columns[col.key] = col.id;
    });
    
    // Step 2: Add a test item
    console.log('\n\n📝 Step 2: Adding test bug item...');
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
                      text: 'Test Bug: Button does not work'
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
        },
        {
          column_id: columns.priority,
          select: ['high']
        }
      ]
    });
    
    console.log('Item creation response:', JSON.stringify(itemResponse, null, 2));
    
    if (!itemResponse.ok) {
      throw new Error(`Failed to create item: ${itemResponse.error}`);
    }
    
    const itemId = itemResponse.row_id || itemResponse.item?.id;
    console.log(`✅ Item created successfully!`);
    console.log(`   Item ID: ${itemId}`);
    console.log(`   Bug Name: Test Bug: Button does not work`);
    console.log(`   Status: Open`);
    console.log(`   Priority: High`);
    
    // Step 3: Update the item
    console.log('\n\n🔄 Step 3: Updating item status to "In Progress"...');
    const updateResponse = await slackClient.apiCall('slackLists.items.update', {
      list_id: testListId,
      cells: [
        {
          column_id: columns.status,
          select: ['in_progress'],
          row_id: itemId  // row_id goes INSIDE the cell object!
        }
      ]
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update item: ${updateResponse.error}`);
    }
    
    console.log(`✅ Item updated successfully!`);
    console.log(`   Status changed to: In Progress`);
    
    // Step 4: List all items (skip individual item.info due to API client issues)
    console.log('\n\n📋 Step 4: Listing all items in list...');
    const listResponse = await slackClient.apiCall('slackLists.items.list', {
      list_id: testListId
    });
    
    if (!listResponse.ok) {
      throw new Error(`Failed to list items: ${listResponse.error}`);
    }
    
    console.log(`✅ Found ${listResponse.items ? listResponse.items.length : 0} item(s) in list`);
    if (listResponse.items && listResponse.items.length > 0) {
      console.log(`\n   Item details:`);
      listResponse.items.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ID: ${item.id}`);
        if (item.fields) {
          item.fields.forEach(field => {
            const displayValue = field.text || field.value || field.select?.[0] || 'N/A';
            console.log(`      - ${field.key}: ${displayValue}`);
          });
        }
      });
    }
    
    // Step 5: Clean up - Delete the item
    console.log('\n\n🗑️  Step 5: Cleaning up - Deleting test item...');
    const deleteItemResponse = await slackClient.apiCall('slackLists.items.delete', {
      list_id: testListId,
      id: itemId
    });
    
    if (!deleteItemResponse.ok) {
      throw new Error(`Failed to delete item: ${deleteItemResponse.error}`);
    }
    
    console.log(`✅ Item deleted successfully!`);
    
    // Step 6: Delete the test list
    console.log('\n\n🗑️  Step 6: Deleting test list...');
    
    // Note: There's no direct "delete list" API method yet
    // Lists can be archived/hidden but not deleted via API currently
    console.log('⚠️  Note: Slack Lists API does not support list deletion yet.');
    console.log(`   You may need to manually archive/delete the list "Bug Board Test"`);
    console.log(`   List ID: ${testListId}`);
    
    // Summary
    console.log('\n\n=== TEST SUMMARY ===');
    console.log('✅ Core Slack Lists API operations successful!');
    console.log('');
    console.log('Verified operations:');
    console.log('  ✅ slackLists.create - Create list with schema');
    console.log('  ✅ slackLists.items.create - Add items');
    console.log('  ✅ slackLists.items.update - Update items');
    console.log('  ✅ slackLists.items.list - List all items');
    console.log('  ✅ slackLists.items.delete - Delete items');
    console.log('');
    console.log('🎉 Ready to proceed with bug board sync implementation!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Build sync engine to fetch from Asana');
    console.log('  2. Transform Asana data to Slack List format');
    console.log('  3. Implement create/delete logic (updates can use direct HTTP if needed)');
    console.log('  4. Add caching and scheduling');
    console.log('');
    console.log(`Note: Please manually clean up test list "Bug Board Test" (ID: ${testListId})`);
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
    
    // Check for common permission issues
    if (error.message.includes('missing_scope')) {
      console.error('\n⚠️  PERMISSION ERROR:');
      console.error('Your Slack app is missing required scopes.');
      console.error('Please add these OAuth scopes in your Slack app settings:');
      console.error('  - lists:read');
      console.error('  - lists:write');
      console.error('Then reinstall the app to your workspace.');
    }
    
    if (error.message.includes('invalid_auth')) {
      console.error('\n⚠️  AUTHENTICATION ERROR:');
      console.error('Your SLACK_BOT_TOKEN is invalid or expired.');
      console.error('Please check your .env file and ensure you copied the correct token.');
    }
    
    if (error.message.includes('paid_only')) {
      console.error('\n⚠️  PAID FEATURE:');
      console.error('Slack Lists are only available on paid Slack plans.');
      console.error('Please ensure your workspace is on a paid plan.');
    }
    
    if (testListId) {
      console.error(`\n⚠️  Note: Test list (ID: ${testListId}) may still exist. Please clean up manually.`);
    }
    
    process.exit(1);
  }
}

// Run the test
testSlackListAPI();

