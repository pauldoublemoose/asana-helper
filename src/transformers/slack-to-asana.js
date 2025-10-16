/**
 * SlackToAsanaTransformer - Transforms Slack List items to Asana task format
 */
class SlackToAsanaTransformer {
  constructor(sectionMap, customFieldMap) {
    // Map status name -> Asana section GID
    this.sectionMap = sectionMap;
    
    // Map field key -> Asana custom field GID
    this.customFieldMap = customFieldMap;
  }
  
  /**
   * Transform a Slack List item to Asana task format
   * @param {object} slackItem - Slack List item
   * @returns {object} Asana task data
   */
  transform(slackItem) {
    const cells = this.parseCells(slackItem.fields || slackItem.cells);
    
    // Map custom fields
    const customFields = {};
    
    // Priority (enum)
    if (cells.priority && this.customFieldMap.priority) {
      customFields[this.customFieldMap.priority] = cells.priority;
    }
    
    // Severity (enum)
    if (cells.severity && this.customFieldMap.severity) {
      customFields[this.customFieldMap.severity] = cells.severity;
    }
    
    // Bug Category (enum)
    if (cells.bug_category && this.customFieldMap.bug_category) {
      customFields[this.customFieldMap.bug_category] = cells.bug_category;
    }
    
    // Platform (enum)
    if (cells.platform && this.customFieldMap.platform) {
      customFields[this.customFieldMap.platform] = cells.platform;
    }
    
    // Repro Rate (enum)
    if (cells.repro_rate && this.customFieldMap.repro_rate) {
      customFields[this.customFieldMap.repro_rate] = cells.repro_rate;
    }
    
    // Regression Status (enum)
    if (cells.regression_status && this.customFieldMap.regression_status) {
      customFields[this.customFieldMap.regression_status] = cells.regression_status;
    }
    
    // Version (text)
    if (cells.version && this.customFieldMap.version) {
      customFields[this.customFieldMap.version] = cells.version;
    }
    
    // Get section GID from status
    const sectionGid = this.sectionMap[cells.status] || this.sectionMap['Backlog'];
    
    return {
      name: cells.bug_name || 'Untitled Bug',
      notes: cells.description || '',
      customFields: customFields,
      sectionGid: sectionGid,
      assignee: null // TODO: Map Slack users to Asana users
    };
  }
  
  /**
   * Extract Asana task GID from Slack item's asana_link field
   * @param {object} slackItem - Slack List item
   * @returns {string|null} Asana task GID or null if not found
   */
  extractAsanaGid(slackItem) {
    const cells = this.parseCells(slackItem.fields || slackItem.cells);
    const link = cells.asana_link;
    
    if (!link) return null;
    
    // Asana task URLs look like: https://app.asana.com/0/PROJECT_GID/TASK_GID
    // or: https://app.asana.com/0/0/TASK_GID
    const match = link.match(/\/(\d+)$/);
    return match ? match[1] : null;
  }
  
  /**
   * Parse Slack cells/fields array into object keyed by column key
   * @param {array} cells - Array of cell/field objects from Slack
   * @returns {object} Cells keyed by column key
   */
  parseCells(cells) {
    const result = {};
    
    if (!cells || !Array.isArray(cells)) {
      return result;
    }
    
    cells.forEach(cell => {
      const key = cell.key || cell.column_key;
      
      // Handle different cell types
      if (cell.text !== undefined) {
        result[key] = cell.text;
      } else if (cell.select && Array.isArray(cell.select)) {
        // Select fields - take first value
        result[key] = cell.select[0];
      } else if (cell.link && Array.isArray(cell.link)) {
        // Link can be an array - take first link's originalUrl
        result[key] = cell.link[0]?.originalUrl || cell.link[0]?.displayName;
      } else if (cell.link) {
        result[key] = cell.link.url || cell.link.text;
      } else if (cell.user) {
        result[key] = cell.user;
      } else if (cell.checkbox !== undefined) {
        result[key] = cell.checkbox;
      }
    });
    
    return result;
  }
}

module.exports = SlackToAsanaTransformer;

