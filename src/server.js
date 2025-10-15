require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const express = require('express');
const crypto = require('crypto');

const AsanaWriter = require('./asana/asana-writer');
const AsanaClient = require('../lib/asana-client');
const SlackToAsanaTransformer = require('./transformers/slack-to-asana');
const AsanaToSlackTransformer = require('./transformers/asana-to-slack');
const EchoDetector = require('./utils/echo-detector');

// ============================================
// INITIALIZATION
// ============================================

console.log('🚀 MooseBot Sync Server Starting...');

// Initialize Slack clients (no RTM needed for Events API)
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Initialize Asana clients
const asanaWriter = new AsanaWriter(
  process.env.ASANA_ACCESS_TOKEN,
  process.env.ASANA_PROJECT_ID
);
const asanaClient = new AsanaClient(
  process.env.ASANA_ACCESS_TOKEN,
  process.env.ASANA_PROJECT_ID
);

// Initialize transformers (will be configured after fetching metadata)
let slackToAsana;
let asanaToSlack;
let columnMap = {};

// Initialize echo detector
const echoDetector = new EchoDetector(10000); // 10 second window

// Express app for Asana webhooks
const app = express();
app.use(express.json());
app.use(express.text()); // For webhook signature verification

// ============================================
// SLACK → ASANA (Events API webhook)
// ============================================

app.post('/slack-events', async (req, res) => {
  try {
    const payload = req.body;
    
    console.log('📥 Received Slack webhook:', payload.type);
    
    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      console.log('🤝 Slack Events API verification challenge');
      return res.json({ challenge: payload.challenge });
    }
    
    // Acknowledge receipt immediately
    res.status(200).send();
    
    // Handle event callback
    if (payload.type === 'event_callback') {
      const event = payload.event;
      
      console.log('🔔 Slack event received:', event.type, JSON.stringify(event, null, 2));
      
      // Handle file_change event
      if (event.type === 'file_change') {
        const file = event.file;
        
        // Filter: only our List file
        if (file.id !== process.env.SLACK_LIST_ID) {
          console.log(`Ignoring file ${file.id}, not our list`);
          return;
        }
        
        console.log('📝 Slack List changed, syncing to Asana...');
        
        // Small delay to let Slack finalize the change
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated List items
        const response = await slack.apiCall('slackLists.items.list', {
          list_id: process.env.SLACK_LIST_ID
        });
        
        const items = response.items || [];
    console.log(`Found ${items.length} items in Slack List`);
    
    for (const item of items) {
      const itemId = item.id;
      
      // Echo detection: ignore if we just updated this from Asana
      if (echoDetector.shouldIgnore(itemId, 'slack')) {
        console.log(`⏭️  Skipping ${itemId} (echo from Asana)`);
        continue;
      }
      
      try {
        // Transform Slack → Asana
        const asanaData = slackToAsana.transform(item);
        const asanaGid = slackToAsana.extractAsanaGid(item);
        
        if (asanaGid) {
          // Update existing task
          console.log(`Updating existing Asana task ${asanaGid}...`);
          
          await asanaWriter.updateTask(asanaGid, asanaData);
          
          if (asanaData.sectionGid) {
            await asanaWriter.moveToSection(asanaGid, asanaData.sectionGid);
          }
          
          console.log(`✅ Updated Asana task ${asanaGid}`);
        } else {
          // Create new task
          console.log(`Creating new Asana task...`);
          
          const newTask = await asanaWriter.createTask(
            asanaData.sectionGid,
            asanaData
          );
          
          // Add Asana link back to Slack item
          console.log(`Adding Asana link to Slack item ${itemId}...`);
          await slack.apiCall('slackLists.items.update', {
            list_id: process.env.SLACK_LIST_ID,
            cells: [{
              row_id: itemId,
              column_id: columnMap.asana_link,
              link: {
                url: newTask.permalink_url,
                text: 'View in Asana'
              }
            }]
          });
          
          console.log(`✅ Created Asana task ${newTask.gid}`);
        }
        
        // Mark update to prevent echo
        echoDetector.markUpdate(itemId, 'slack');
        
      } catch (error) {
        console.error(`❌ Error syncing item ${itemId}:`, error.message);
      }
    }
    
    console.log('✅ Slack → Asana sync complete');
      }
    }
    
  } catch (error) {
    console.error('❌ Error handling Slack event:', error);
  }
});

// ============================================
// ASANA → SLACK (HTTP webhook)
// ============================================

app.post('/asana-webhook', async (req, res) => {
  try {
    // Handle handshake
    if (req.headers['x-hook-secret']) {
      console.log('🤝 Asana webhook handshake initiated');
      res.setHeader('X-Hook-Secret', req.headers['x-hook-secret']);
      console.log('✅ Asana webhook handshake complete');
      return res.status(200).send();
    }
    
    // Verify signature (if webhook secret is set)
    if (process.env.ASANA_WEBHOOK_SECRET) {
      const signature = req.headers['x-hook-signature'];
      const body = JSON.stringify(req.body);
      const computedSignature = crypto
        .createHmac('sha256', process.env.ASANA_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== computedSignature) {
        console.warn('⚠️  Invalid Asana webhook signature');
        return res.status(401).send('Invalid signature');
      }
    }
    
    // Acknowledge immediately (Asana expects response within 10 seconds)
    res.status(200).send();
    
    // Process events asynchronously
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      console.log('No events in webhook payload');
      return;
    }
    
    console.log(`📬 Received ${events.length} Asana webhook events`);
    
    for (const event of events) {
      // Only process task events
      if (event.resource?.resource_type !== 'task') {
        continue;
      }
      
      const taskGid = event.resource.gid;
      
      // Echo detection: ignore if we just updated this from Slack
      if (echoDetector.shouldIgnore(taskGid, 'asana')) {
        console.log(`⏭️  Skipping ${taskGid} (echo from Slack)`);
        continue;
      }
      
      try {
        if (event.action === 'changed' || event.action === 'added') {
          console.log(`Processing ${event.action} event for task ${taskGid}...`);
          
          // Fetch full task details
          const task = await asanaClient.getTask(taskGid);
          
          if (!task) {
            console.warn(`Could not fetch task ${taskGid}`);
            continue;
          }
          
          // Find corresponding Slack item
          const slackItemId = await findSlackItemByAsanaGid(taskGid);
          
          // Transform Asana → Slack
          const slackCells = asanaToSlack.transform(task);
          
          if (slackItemId) {
            // Update existing item
            console.log(`Updating Slack item ${slackItemId}...`);
            
            await slack.apiCall('slackLists.items.update', {
              list_id: process.env.SLACK_LIST_ID,
              cells: slackCells.map(cell => ({
                ...cell,
                row_id: slackItemId
              }))
            });
            
            console.log(`✅ Updated Slack item ${slackItemId}`);
          } else {
            // Create new item
            console.log(`Creating new Slack item for task ${taskGid}...`);
            
            await slack.apiCall('slackLists.items.create', {
              list_id: process.env.SLACK_LIST_ID,
              cells: slackCells
            });
            
            console.log(`✅ Created new Slack item for task ${taskGid}`);
          }
          
          // Mark update to prevent echo
          echoDetector.markUpdate(taskGid, 'asana');
          
        } else if (event.action === 'removed' || event.action === 'deleted') {
          console.log(`Processing ${event.action} event for task ${taskGid}...`);
          
          // Delete from Slack
          const slackItemId = await findSlackItemByAsanaGid(taskGid);
          
          if (slackItemId) {
            await slack.apiCall('slackLists.items.delete', {
              list_id: process.env.SLACK_LIST_ID,
              item_id: slackItemId
            });
            
            console.log(`✅ Deleted Slack item ${slackItemId}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing task ${taskGid}:`, error.message);
      }
    }
    
    console.log('✅ Asana → Slack sync complete');
    
  } catch (error) {
    console.error('❌ Error in Asana webhook handler:', error);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find Slack List item by Asana task GID
 * Searches through all items for matching Asana link
 */
async function findSlackItemByAsanaGid(asanaGid) {
  try {
    const response = await slack.apiCall('slackLists.items.list', {
      list_id: process.env.SLACK_LIST_ID
    });
    
    const items = response.items || [];
    
    for (const item of items) {
      const itemAsanaGid = slackToAsana.extractAsanaGid(item);
      if (itemAsanaGid === asanaGid) {
        return item.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding Slack item:', error.message);
    return null;
  }
}

// ============================================
// HEALTH CHECK & STATUS
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    events_api: 'enabled',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'MooseBot Sync Server',
    version: '1.0.0',
    status: 'running',
    events_api: 'enabled',
    endpoints: {
      health: '/health',
      asana_webhook: '/asana-webhook',
      test_sync: '/test-sync',
      manual_sync: '/manual-sync'
    }
  });
});

// Test endpoint to check Slack List access
app.get('/test-sync', async (req, res) => {
  try {
    console.log('🧪 Testing Slack List access...');
    
    const response = await slack.apiCall('slackLists.items.list', {
      list_id: process.env.SLACK_LIST_ID
    });
    
    const items = response.items || [];
    
    res.json({
      success: true,
      list_id: process.env.SLACK_LIST_ID,
      item_count: items.length,
      items: items.map(item => ({
        id: item.id,
        fields: item.fields.length,
        created: item.date_created
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual sync trigger endpoint
app.post('/manual-sync', async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered...');
    
    // Fetch Slack List items
    const response = await slack.apiCall('slackLists.items.list', {
      list_id: process.env.SLACK_LIST_ID
    });
    
    const items = response.items || [];
    console.log(`Found ${items.length} items in Slack List`);
    
    let created = 0, updated = 0, errors = 0;
    
    for (const item of items) {
      const itemId = item.id;
      
      try {
        // Transform Slack → Asana
        const asanaData = slackToAsana.transform(item);
        const asanaGid = slackToAsana.extractAsanaGid(item);
        
        if (asanaGid) {
          // Update existing task
          console.log(`Updating Asana task ${asanaGid}...`);
          await asanaWriter.updateTask(asanaGid, asanaData);
          
          if (asanaData.sectionGid) {
            await asanaWriter.moveToSection(asanaGid, asanaData.sectionGid);
          }
          updated++;
        } else {
          // Create new task
          console.log(`Creating new Asana task...`);
          const newTask = await asanaWriter.createTask(
            asanaData.sectionGid,
            asanaData
          );
          
          // Add Asana link back to Slack item
          await slack.apiCall('slackLists.items.update', {
            list_id: process.env.SLACK_LIST_ID,
            cells: [{
              row_id: itemId,
              column_id: columnMap.asana_link,
              link: {
                url: newTask.permalink_url,
                text: 'View in Asana'
              }
            }]
          });
          created++;
        }
      } catch (error) {
        console.error(`Error syncing item ${itemId}:`, error.message);
        errors++;
      }
    }
    
    res.json({
      success: true,
      synced: items.length,
      created,
      updated,
      errors
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// STARTUP
// ============================================

async function start() {
  try {
    console.log('📊 Fetching metadata from Asana and Slack...');
    
    // 1. Fetch Asana metadata
    console.log('  - Fetching Asana sections...');
    const sections = await asanaClient.getSections();
    const sectionMap = {};
    sections.forEach(s => {
      // Map section name to GID (lowercase, underscored)
      const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      sectionMap[key] = s.gid;
    });
    console.log(`  ✅ Loaded ${sections.length} Asana sections`);
    
    console.log('  - Fetching Asana custom fields...');
    const customFields = await asanaClient.getCustomFields();
    const customFieldMap = {};
    customFields.forEach(cf => {
      // Map field name to GID (lowercase, underscored)
      const key = cf.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      customFieldMap[key] = cf.gid;
    });
    console.log(`  ✅ Loaded ${customFields.length} Asana custom fields`);
    
    // 2. Fetch Slack List metadata
    console.log('  - Fetching Slack List schema...');
    // Note: slackLists.info method doesn't exist in the Slack API
    // We'll build the column map from actual list items instead
    const itemsResponse = await slack.apiCall('slackLists.items.list', {
      list_id: process.env.SLACK_LIST_ID,
      limit: 1
    });
    
    // Build column map from the first item's fields
    if (itemsResponse.items && itemsResponse.items.length > 0) {
      const firstItem = itemsResponse.items[0];
      firstItem.fields.forEach(field => {
        if (field.column_id) {
          columnMap[field.key] = field.column_id;
        }
      });
    }
    console.log(`  ✅ Loaded ${Object.keys(columnMap).length} Slack List columns`);
    
    // 3. Initialize transformers
    slackToAsana = new SlackToAsanaTransformer(sectionMap, customFieldMap);
    asanaToSlack = new AsanaToSlackTransformer(columnMap);
    console.log('✅ Transformers initialized');
    
    // 4. Events API configured (no connection needed)
    console.log('✅ Slack Events API endpoint ready at /slack-events');
    
    // 5. Start Express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`📡 Webhook endpoint: http://localhost:${PORT}/asana-webhook`);
      console.log('✅ Ready to sync Asana ↔ Slack');
      console.log('');
      console.log('Configuration:');
      console.log(`  - Asana Project: ${process.env.ASANA_PROJECT_ID}`);
      console.log(`  - Slack List: ${process.env.SLACK_LIST_ID}`);
      console.log(`  - Sections: ${Object.keys(sectionMap).length}`);
      console.log(`  - Custom Fields: ${Object.keys(customFieldMap).length}`);
      console.log(`  - List Columns: ${Object.keys(columnMap).length}`);
    });
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  echoDetector.destroy();
  // No RTM to disconnect
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  echoDetector.destroy();
  // No RTM to disconnect
  process.exit(0);
});

// Start the server
start();

