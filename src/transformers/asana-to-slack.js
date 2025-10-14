const { mapAsanaSectionToSlackStatus, mapAsanaEnumToSlackValue } = require('../../asana-helper/schema');

/**
 * AsanaToSlackTransformer - Transforms Asana tasks to Slack List item format
 */
class AsanaToSlackTransformer {
  constructor(columnMap) {
    // Map column key -> Slack List column ID
    this.columnMap = columnMap;
  }
  
  /**
   * Transform an Asana task to Slack List cells format
   * @param {object} asanaTask - Asana task object
   * @returns {array} Array of cell objects for Slack List
   */
  transform(asanaTask) {
    const cells = [];
    
    // Bug Name (primary column)
    if (this.columnMap.bug_name) {
      cells.push({
        column_id: this.columnMap.bug_name,
        text: asanaTask.name
      });
    }
    
    // Status (from section)
    const section = asanaTask.memberships?.[0]?.section;
    if (section && this.columnMap.status) {
      const status = mapAsanaSectionToSlackStatus(section.gid);
      cells.push({
        column_id: this.columnMap.status,
        select: [status]
      });
    }
    
    // Custom fields
    if (asanaTask.custom_fields && Array.isArray(asanaTask.custom_fields)) {
      asanaTask.custom_fields.forEach(cf => {
        const columnId = this.getColumnIdForCustomField(cf.name);
        if (!columnId) return;
        
        if (cf.type === 'enum' && cf.enum_value) {
          const slackValue = mapAsanaEnumToSlackValue(cf.name, cf.enum_value.name);
          if (slackValue) {
            cells.push({
              column_id: columnId,
              select: [slackValue]
            });
          }
        } else if (cf.type === 'text' && cf.text_value) {
          cells.push({
            column_id: columnId,
            text: cf.text_value
          });
        } else if (cf.type === 'number' && cf.number_value !== null) {
          cells.push({
            column_id: columnId,
            text: cf.number_value.toString()
          });
        }
      });
    }
    
    // Assignee (if we have mapping)
    // TODO: Implement Asana user GID -> Slack user ID mapping
    if (asanaTask.assignee && this.columnMap.assignee) {
      // For now, skip assignee until we implement user mapping
      // cells.push({
      //   column_id: this.columnMap.assignee,
      //   user: [slackUserId]
      // });
    }
    
    // Asana link
    if (asanaTask.permalink_url && this.columnMap.asana_link) {
      cells.push({
        column_id: this.columnMap.asana_link,
        link: {
          url: asanaTask.permalink_url,
          text: 'View in Asana'
        }
      });
    }
    
    // Created date
    if (asanaTask.created_at && this.columnMap.created_at) {
      const date = new Date(asanaTask.created_at);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      cells.push({
        column_id: this.columnMap.created_at,
        date: formattedDate
      });
    }
    
    return cells;
  }
  
  /**
   * Get Slack List column ID for an Asana custom field
   * @param {string} fieldName - Asana custom field name
   * @returns {string|null} Slack column ID or null
   */
  getColumnIdForCustomField(fieldName) {
    // Map Asana custom field names to Slack column keys
    const mapping = {
      'Priority': 'priority',
      'Severity': 'severity',
      'Bug Category': 'bug_category',
      'Platform': 'platform',
      'Repro Rate': 'repro_rate',
      'Regression Status': 'regression_status',
      'Version': 'version',
      'Version (in-game)': 'version'
    };
    
    const columnKey = mapping[fieldName];
    return columnKey ? this.columnMap[columnKey] : null;
  }
}

module.exports = AsanaToSlackTransformer;

