const Asana = require('asana');

class AsanaClient {
  constructor(accessToken, projectId) {
    const apiClient = Asana.ApiClient.instance;
    const token = apiClient.authentications['token'];
    token.accessToken = accessToken;
    
    this.projectsApi = new Asana.ProjectsApi();
    this.sectionsApi = new Asana.SectionsApi();
    this.tasksApi = new Asana.TasksApi();
    this.projectId = projectId;
  }
  
  /**
   * Fetch all sections from the project
   */
  async getSections() {
    const response = await this.sectionsApi.getSectionsForProject(this.projectId, {});
    return response.data;
  }
  
  /**
   * Fetch a single task by GID
   */
  async getTask(taskGid) {
    const response = await this.tasksApi.getTask(taskGid, {
      opt_fields: [
        'name',
        'completed',
        'assignee',
        'assignee.name',
        'assignee.email',
        'assignee.gid',
        'due_on',
        'custom_fields',
        'custom_fields.name',
        'custom_fields.type',
        'custom_fields.enum_value',
        'custom_fields.enum_value.name',
        'custom_fields.number_value',
        'custom_fields.text_value',
        'memberships.section',
        'memberships.section.name',
        'memberships.section.gid',
        'notes',
        'created_at',
        'modified_at',
        'permalink_url',
        'gid'
      ].join(',')
    });
    
    return response.data;
  }
  
  /**
   * Fetch custom fields for the project
   */
  async getCustomFields() {
    const project = await this.getProjectDetails();
    return project.custom_field_settings?.map(setting => ({
      gid: setting.custom_field.gid,
      name: setting.custom_field.name,
      type: setting.custom_field.type,
      enum_options: setting.custom_field.enum_options || []
    })) || [];
  }
  
  /**
   * Fetch all tasks with custom fields from the project
   */
  async getTasks() {
    const response = await this.tasksApi.getTasksForProject(this.projectId, {
      opt_fields: [
        'name',
        'completed',
        'assignee',
        'assignee.name',
        'assignee.email',
        'assignee.gid',
        'due_on',
        'custom_fields',
        'custom_fields.name',
        'custom_fields.type',
        'custom_fields.enum_value',
        'custom_fields.enum_value.name',
        'custom_fields.number_value',
        'custom_fields.text_value',
        'memberships.section',
        'memberships.section.name',
        'memberships.section.gid',
        'notes',
        'created_at',
        'modified_at',
        'permalink_url',
        'gid'
      ].join(',')
    });
    
    return response.data;
  }
  
  /**
   * Fetch project details including custom field definitions
   */
  async getProjectDetails() {
    const response = await this.projectsApi.getProject(this.projectId, {
      opt_fields: 'custom_field_settings,custom_field_settings.custom_field,custom_field_settings.custom_field.name,custom_field_settings.custom_field.type,custom_field_settings.custom_field.enum_options,custom_field_settings.custom_field.enum_options.name,custom_field_settings.custom_field.enum_options.color'
    });
    
    return response.data;
  }
  
  /**
   * Get all bug board data in one call
   */
  async getBugBoardData() {
    const [project, sections, tasks] = await Promise.all([
      this.getProjectDetails(),
      this.getSections(),
      this.getTasks()
    ]);
    
    // Extract custom field definitions
    const customFields = project.custom_field_settings?.map(setting => ({
      gid: setting.custom_field.gid,
      name: setting.custom_field.name,
      type: setting.custom_field.type,
      enum_options: setting.custom_field.enum_options || []
    })) || [];
    
    return {
      project: {
        gid: project.gid,
        name: project.name
      },
      sections,
      tasks,
      customFields
    };
  }
}

module.exports = AsanaClient;

