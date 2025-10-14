/**
 * Slack List Schema for LMS - QA Board
 * Maps Asana custom fields to Slack List columns
 */

// Asana field GIDs for reference
const ASANA_FIELD_IDS = {
  BUG_CATEGORY: '1211636938617208',
  PRIORITY: '1211636939819718',
  SEVERITY: '1211636939819733',
  REPRO_RATE: '1211636939828926',
  VERSION: '1211636939828941',
  PLATFORM: '1211636939828948',
  REGRESSION_STATUS: '1211636939835126'
};

// Asana section GIDs
const ASANA_SECTIONS = {
  IMPORTANT_INFO: '1211636939835137',
  OPEN_BUGS: '1211636939835139',
  IN_PROGRESS: '1211636939835141',
  REGRESSION: '1211636939835143',
  FIXED: '1211635085103433',
  CLOSED: '1211636939835145',
  NEEDS_MORE_INFO: '1211636939851139',
  COMMUNITY_REPORTS: '1211636939851141'
};

/**
 * Slack List schema definition
 * Based on https://docs.slack.dev/reference/methods/slackLists.create/
 */
const bugBoardSchema = [
  {
    key: "bug_name",
    name: "Bug Name",
    type: "text",
    is_primary_column: true
  },
  {
    key: "status",
    name: "Status",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "important_info", label: "Important Info", color: "purple" },
        { value: "open_bugs", label: "Open Bugs", color: "red" },
        { value: "in_progress", label: "In Progress", color: "yellow" },
        { value: "regression", label: "Regression", color: "orange" },
        { value: "fixed", label: "Fixed", color: "green" },
        { value: "closed", label: "Closed", color: "gray" },
        { value: "needs_more_info", label: "Needs More Info", color: "blue" },
        { value: "community_reports", label: "Community Reports", color: "cyan" }
      ]
    }
  },
  {
    key: "bug_category",
    name: "Bug Category",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "code", label: "Code", color: "green" },
        { value: "level_design", label: "Level Design", color: "red" },
        { value: "game_design", label: "Game Design", color: "cyan" },
        { value: "visual_art", label: "Visual Art", color: "orange" },
        { value: "audio", label: "Audio", color: "yellow" },
        { value: "text", label: "Text", color: "yellow" },
        { value: "first_party", label: "First-Party Requirement", color: "blue" }
      ]
    }
  },
  {
    key: "priority",
    name: "Priority",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "low", label: "Low", color: "green" },
        { value: "medium", label: "Medium", color: "yellow" },
        { value: "high", label: "High", color: "orange" },
        { value: "critical", label: "Critical", color: "red" }
      ]
    }
  },
  {
    key: "severity",
    name: "Severity",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "low", label: "Low", color: "green" },
        { value: "medium", label: "Medium", color: "yellow" },
        { value: "high", label: "High", color: "orange" },
        { value: "critical", label: "Critical", color: "red" }
      ]
    }
  },
  {
    key: "repro_rate",
    name: "Repro Rate",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "100", label: "100%", color: "red" },
        { value: "75", label: "75%", color: "orange" },
        { value: "50", label: "50%", color: "yellow" },
        { value: "25", label: "25% and less", color: "green" }
      ]
    }
  },
  {
    key: "platform",
    name: "Platform",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "pc", label: "PC (Steam, GOG, Epic)", color: "green" },
        { value: "xbox_one", label: "Xbox One", color: "red" },
        { value: "xbox_series", label: "Xbox Series", color: "orange" },
        { value: "ps4", label: "PS4", color: "yellow" },
        { value: "ps5", label: "PS5", color: "yellow" },
        { value: "switch", label: "Switch", color: "green" },
        { value: "vr", label: "VR", color: "cyan" }
      ]
    }
  },
  {
    key: "version",
    name: "Version (in-game)",
    type: "text"
  },
  {
    key: "assignee",
    name: "Assignee",
    type: "user",
    options: {
      format: "single_entity",
      notify_users: false
    }
  },
  {
    key: "regression_status",
    name: "Regression Status",
    type: "select",
    options: {
      format: "single_select",
      choices: [
        { value: "bug_fixed", label: "Bug Fixed", color: "green" },
        { value: "bug_still_occurs", label: "Bug Still Occurs", color: "red" }
      ]
    }
  },
  {
    key: "asana_link",
    name: "View in Asana",
    type: "link"
  },
  {
    key: "created_at",
    name: "Created",
    type: "date",
    options: {
      date_format: "MMMM DD, YYYY"
    }
  }
];

/**
 * Map Asana section GID to Slack status value
 */
function mapAsanaSectionToSlackStatus(sectionGid) {
  const mapping = {
    [ASANA_SECTIONS.IMPORTANT_INFO]: 'important_info',
    [ASANA_SECTIONS.OPEN_BUGS]: 'open_bugs',
    [ASANA_SECTIONS.IN_PROGRESS]: 'in_progress',
    [ASANA_SECTIONS.REGRESSION]: 'regression',
    [ASANA_SECTIONS.FIXED]: 'fixed',
    [ASANA_SECTIONS.CLOSED]: 'closed',
    [ASANA_SECTIONS.NEEDS_MORE_INFO]: 'needs_more_info',
    [ASANA_SECTIONS.COMMUNITY_REPORTS]: 'community_reports'
  };
  return mapping[sectionGid] || 'open_bugs';
}

/**
 * Map Asana enum option name to Slack select value
 */
function mapAsanaEnumToSlackValue(fieldName, asanaValue) {
  if (!asanaValue) return null;
  
  const mappings = {
    'Bug Category': {
      'Code': 'code',
      'Level Design': 'level_design',
      'Game Design': 'game_design',
      'Visual Art': 'visual_art',
      'Audio': 'audio',
      'Text': 'text',
      'First-Party Requirement': 'first_party'
    },
    'Priority': {
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Critical': 'critical'
    },
    'Severity': {
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Critical': 'critical'
    },
    'Repro Rate': {
      '100%': '100',
      '75%': '75',
      '50%': '50',
      '25% and less': '25'
    },
    'Platform': {
      'PC (Steam, GOG, Epic)': 'pc',
      'Xbox One': 'xbox_one',
      'Xbox Series': 'xbox_series',
      'PS4': 'ps4',
      'PS5': 'ps5',
      'Switch': 'switch',
      'VR': 'vr'
    },
    'Regression Status': {
      'Bug fixed': 'bug_fixed',
      'Bug still occurs': 'bug_still_occurs'
    }
  };
  
  return mappings[fieldName]?.[asanaValue] || null;
}

/**
 * Convert Asana task to Slack List item format
 */
function convertAsanaTaskToSlackItem(asanaTask) {
  const section = asanaTask.memberships?.[0]?.section;
  const status = mapAsanaSectionToSlackStatus(section?.gid);
  
  // Build initial fields array
  const fields = [
    {
      column_id: 'bug_name', // Will be replaced with actual column ID
      rich_text: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: asanaTask.name
                }
              ]
            }
          ]
        }
      ]
    },
    {
      column_id: 'status',
      select: [status]
    }
  ];
  
  // Add custom fields
  if (asanaTask.custom_fields) {
    asanaTask.custom_fields.forEach(cf => {
      let value = null;
      
      if (cf.type === 'enum' && cf.enum_value) {
        value = mapAsanaEnumToSlackValue(cf.name, cf.enum_value.name);
        if (value) {
          const columnKey = cf.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
          fields.push({
            column_id: columnKey,
            select: [value]
          });
        }
      } else if (cf.type === 'text' && cf.text_value) {
        fields.push({
          column_id: 'version',
          rich_text: [
            {
              type: 'rich_text',
              elements: [
                {
                  type: 'rich_text_section',
                  elements: [
                    {
                      type: 'text',
                      text: cf.text_value
                    }
                  ]
                }
              ]
            }
          ]
        });
      }
    });
  }
  
  // Add assignee
  if (asanaTask.assignee) {
    // Note: This will need Asana user GID → Slack user ID mapping
    fields.push({
      column_id: 'assignee',
      user: [asanaTask.assignee.gid] // Will need to be mapped to Slack user ID
    });
  }
  
  // Add Asana link
  if (asanaTask.permalink_url) {
    fields.push({
      column_id: 'asana_link',
      link: [
        {
          original_url: asanaTask.permalink_url,
          display_as_url: false,
          display_name: 'Open in Asana'
        }
      ]
    });
  }
  
  // Add created date
  if (asanaTask.created_at) {
    const date = new Date(asanaTask.created_at);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    fields.push({
      column_id: 'created_at',
      date: [formattedDate]
    });
  }
  
  return fields;
}

module.exports = {
  bugBoardSchema,
  ASANA_FIELD_IDS,
  ASANA_SECTIONS,
  mapAsanaSectionToSlackStatus,
  mapAsanaEnumToSlackValue,
  convertAsanaTaskToSlackItem
};

