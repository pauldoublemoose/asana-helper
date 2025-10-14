const { 
  ASANA_SECTIONS, 
  mapAsanaSectionToSlackStatus, 
  mapAsanaEnumToSlackValue 
} = require('./schema');

class DataTransformer {
  /**
   * Transform Asana task to Slack List item format
   * @param {Object} asanaTask - Task from Asana API
   * @param {Object} columnMap - Map of column keys to Slack column IDs
   * @param {Object} userMap - Map of Asana user GIDs to Slack user IDs (optional)
   * @returns {Array} Array of field objects for Slack List item
   */
  static transformTaskToSlackItem(asanaTask, columnMap, userMap = {}) {
    const fields = [];
    
    // 1. Bug Name (primary column)
    if (columnMap.bug_name) {
      fields.push({
        column_id: columnMap.bug_name,
        rich_text: [{
          type: 'rich_text',
          elements: [{
            type: 'rich_text_section',
            elements: [{ type: 'text', text: asanaTask.name || 'Untitled' }]
          }]
        }]
      });
    }
    
    // 2. Status (derived from Asana section)
    if (columnMap.status && asanaTask.memberships?.[0]?.section) {
      const sectionGid = asanaTask.memberships[0].section.gid;
      const status = mapAsanaSectionToSlackStatus(sectionGid);
      fields.push({
        column_id: columnMap.status,
        select: [status]
      });
    }
    
    // 3. Process custom fields
    if (asanaTask.custom_fields) {
      asanaTask.custom_fields.forEach(cf => {
        const fieldName = cf.name;
        let columnKey = null;
        let value = null;
        
        // Map Asana custom field to Slack column
        switch (fieldName) {
          case 'Bug Category':
            columnKey = 'bug_category';
            if (cf.enum_value) {
              value = mapAsanaEnumToSlackValue(fieldName, cf.enum_value.name);
            }
            break;
            
          case 'Priority':
            columnKey = 'priority';
            if (cf.enum_value) {
              value = mapAsanaEnumToSlackValue(fieldName, cf.enum_value.name);
            }
            break;
            
          case 'Severity':
            columnKey = 'severity';
            if (cf.enum_value) {
              value = mapAsanaEnumToSlackValue(fieldName, cf.enum_value.name);
            }
            break;
            
          case 'Repro Rate':
            columnKey = 'repro_rate';
            if (cf.enum_value) {
              value = mapAsanaEnumToSlackValue(fieldName, cf.enum_value.name);
            }
            break;
            
          case 'Platform':
            columnKey = 'platform';
            if (cf.enum_value) {
              value = mapAsanaEnumToSlackValue(fieldName, cf.enum_value.name);
            }
            break;
            
          case 'Version (in-game)':
            columnKey = 'version';
            if (cf.text_value) {
              fields.push({
                column_id: columnMap[columnKey],
                rich_text: [{
                  type: 'rich_text',
                  elements: [{
                    type: 'rich_text_section',
                    elements: [{ type: 'text', text: cf.text_value }]
                  }]
                }]
              });
            }
            break;
            
          case 'Regression Status':
            columnKey = 'regression_status';
            if (cf.enum_value) {
              value = mapAsanaEnumToSlackValue(fieldName, cf.enum_value.name);
            }
            break;
        }
        
        // Add select field if we have a value
        if (columnKey && value && columnMap[columnKey]) {
          fields.push({
            column_id: columnMap[columnKey],
            select: [value]
          });
        }
      });
    }
    
    // 4. Assignee (with user mapping)
    if (columnMap.assignee && asanaTask.assignee) {
      const asanaUserGid = asanaTask.assignee.gid;
      const slackUserId = userMap[asanaUserGid];
      
      if (slackUserId) {
        fields.push({
          column_id: columnMap.assignee,
          user: [slackUserId]
        });
      }
    }
    
    // 5. Asana Link
    if (columnMap.asana_link && asanaTask.permalink_url) {
      fields.push({
        column_id: columnMap.asana_link,
        link: [{
          original_url: asanaTask.permalink_url,
          display_as_url: false,
          display_name: 'Open in Asana'
        }]
      });
    }
    
    // 6. Created date
    if (columnMap.created_at && asanaTask.created_at) {
      const date = new Date(asanaTask.created_at);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      fields.push({
        column_id: columnMap.created_at,
        date: [formattedDate]
      });
    }
    
    return fields;
  }
  
  /**
   * Create a map of Asana task GIDs to their data for quick lookup
   */
  static createTaskMap(asanaTasks) {
    const map = new Map();
    asanaTasks.forEach(task => {
      map.set(task.gid, task);
    });
    return map;
  }
  
  /**
   * Compare Asana task with Slack item to determine if update is needed
   */
  static needsUpdate(asanaTask, slackItem) {
    // For now, we'll update if modified_at is more recent
    // You could add more sophisticated comparison logic here
    if (!asanaTask.modified_at || !slackItem.updated_timestamp) {
      return true; // Update if we can't determine
    }
    
    const asanaModified = new Date(asanaTask.modified_at).getTime();
    const slackModified = parseInt(slackItem.updated_timestamp) * 1000;
    
    return asanaModified > slackModified;
  }
}

module.exports = DataTransformer;

