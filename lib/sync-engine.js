const { WebClient } = require('@slack/web-api');
const AsanaClient = require('./asana-client');
const DataTransformer = require('./data-transformer');
const { bugBoardSchema } = require('./schema');

class SyncEngine {
  constructor(config) {
    this.slackClient = new WebClient(config.slackBotToken);
    this.slackUserToken = config.slackUserToken; // For getting user IDs
    this.asanaClient = new AsanaClient(config.asanaToken, config.asanaProjectId);
    this.listId = config.slackListId;
    this.userMap = {}; // Asana GID -> Slack user ID
    this.columnMap = null; // Will be set when list is created/verified
  }
  
  /**
   * Get or create the Slack List
   */
  async ensureListExists() {
    if (this.listId) {
      // Verify list exists
      try {
        const response = await this.slackClient.apiCall('slackLists.items.list', {
          list_id: this.listId,
          limit: 1
        });
        
        if (response.ok) {
          console.log(`✅ Using existing list: ${this.listId}`);
          return this.listId;
        }
      } catch (error) {
        console.log(`⚠️  List ${this.listId} not found, creating new one...`);
      }
    }
    
    // Create new list
    console.log('📋 Creating new Slack List...');
    const createResponse = await this.slackClient.apiCall('slackLists.create', {
      name: 'LMS - QA Board (Asana Sync)',
      description_blocks: [{
        type: 'rich_text',
        elements: [{
          type: 'rich_text_section',
          elements: [{
            type: 'text',
            text: 'Automatically synced from Asana bug board'
          }]
        }]
      }],
      schema: bugBoardSchema
    });
    
    this.listId = createResponse.list_id;
    console.log(`✅ Created new list: ${this.listId}`);
    
    // Store column mapping from creation response
    this.columnMap = {};
    createResponse.list_metadata.schema.forEach(col => {
      this.columnMap[col.key] = col.id;
    });
    console.log(`✅ Stored column mapping for ${Object.keys(this.columnMap).length} columns`);
    
    // Share with user
    if (this.slackUserToken) {
      await this.shareListWithUser();
    }
    
    return this.listId;
  }
  
  /**
   * Share the list with the user
   */
  async shareListWithUser() {
    try {
      const userClient = new WebClient(this.slackUserToken);
      const authResponse = await userClient.auth.test();
      const userId = authResponse.user_id;
      
      console.log(`📤 Sharing list with user ${userId}...`);
      await this.slackClient.apiCall('slackLists.access.set', {
        list_id: this.listId,
        user_ids: [userId],
        access_level: 'write'
      });
      
      console.log('✅ List shared with user');
    } catch (error) {
      console.log(`⚠️  Could not share list: ${error.message}`);
    }
  }
  
  /**
   * Get column mapping from the actual list's metadata
   */
  async getColumnMapping() {
    // We need to get the column IDs from the list that was created
    // The list ID is stored in this.listId after ensureListExists()
    // We'll extract it from the create response or fetch list details
    
    // For now, we'll store the column map when the list is created
    if (this.columnMap) {
      return this.columnMap;
    }
    
    throw new Error('Column mapping not available. Call ensureListExists() first.');
  }
  
  /**
   * Fetch all current items from Slack List
   */
  async getSlackListItems() {
    const items = [];
    let cursor = null;
    
    do {
      const response = await this.slackClient.apiCall('slackLists.items.list', {
        list_id: this.listId,
        limit: 100,
        ...(cursor && { cursor })
      });
      
      items.push(...(response.items || []));
      cursor = response.response_metadata?.next_cursor;
    } while (cursor);
    
    return items;
  }
  
  /**
   * Main sync function
   */
  async sync() {
    console.log('🔄 Starting Asana → Slack sync...\n');
    
    try {
      // 1. Ensure list exists
      await this.ensureListExists();
      
      // 2. Column mapping is already set from ensureListExists()
      const columnMap = this.columnMap;
      if (!columnMap) {
        throw new Error('Column mapping not available');
      }
      console.log(`✅ Using column mapping for ${Object.keys(columnMap).length} columns`);
      
      // 3. Fetch Asana data
      console.log('\n📥 Fetching data from Asana...');
      const asanaData = await this.asanaClient.getBugBoardData();
      console.log(`✅ Found ${asanaData.tasks.length} tasks in Asana`);
      console.log(`   Sections: ${asanaData.sections.map(s => s.name).join(', ')}`);
      
      // 4. Fetch current Slack items
      console.log('\n📥 Fetching current Slack List items...');
      const slackItems = await this.getSlackListItems();
      console.log(`✅ Found ${slackItems.length} items in Slack List`);
      
      // 5. Build maps for comparison
      const asanaTaskMap = DataTransformer.createTaskMap(asanaData.tasks);
      const slackItemMap = new Map();
      slackItems.forEach(item => {
        // Store by Asana GID if we can find it in metadata or fields
        // For now, use item name as key (not ideal, but works for demo)
        const nameField = item.fields?.find(f => f.key === 'bug_name');
        if (nameField) {
          slackItemMap.set(nameField.text || nameField.value, item);
        }
      });
      
      // 6. Sync logic
      const stats = { created: 0, updated: 0, deleted: 0, skipped: 0 };
      
      console.log('\n🔄 Syncing items...');
      
      // Create/Update items from Asana
      for (const asanaTask of asanaData.tasks) {
        const existingSlackItem = slackItemMap.get(asanaTask.name);
        
        if (!existingSlackItem) {
          // Create new item
          await this.createSlackItem(asanaTask, columnMap);
          stats.created++;
        } else if (DataTransformer.needsUpdate(asanaTask, existingSlackItem)) {
          // Update existing item
          await this.updateSlackItem(existingSlackItem.id, asanaTask, columnMap);
          stats.updated++;
        } else {
          stats.skipped++;
        }
      }
      
      console.log('\n=== SYNC COMPLETE ===');
      console.log(`✅ Created: ${stats.created}`);
      console.log(`🔄 Updated: ${stats.updated}`);
      console.log(`⏭️  Skipped: ${stats.skipped}`);
      console.log(`📊 Total in Slack: ${stats.created + stats.updated + stats.skipped}`);
      
      return stats;
      
    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Create a new Slack List item
   */
  async createSlackItem(asanaTask, columnMap) {
    const fields = DataTransformer.transformTaskToSlackItem(
      asanaTask, 
      columnMap, 
      this.userMap
    );
    
    await this.slackClient.apiCall('slackLists.items.create', {
      list_id: this.listId,
      initial_fields: fields
    });
    
    console.log(`  ✅ Created: ${asanaTask.name}`);
  }
  
  /**
   * Update an existing Slack List item
   */
  async updateSlackItem(itemId, asanaTask, columnMap) {
    const fields = DataTransformer.transformTaskToSlackItem(
      asanaTask,
      columnMap,
      this.userMap
    );
    
    // Convert to cells format for update (row_id in each cell)
    const cells = fields.map(field => ({
      ...field,
      row_id: itemId
    }));
    
    await this.slackClient.apiCall('slackLists.items.update', {
      list_id: this.listId,
      cells
    });
    
    console.log(`  🔄 Updated: ${asanaTask.name}`);
  }
}

module.exports = SyncEngine;

