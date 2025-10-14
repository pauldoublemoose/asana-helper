const Asana = require('asana');

/**
 * AsanaWriter - Handles all write operations to Asana API
 * Supports creating, updating, moving, and completing tasks
 */
class AsanaWriter {
  constructor(accessToken, projectId) {
    this.projectId = projectId;
    
    // Initialize Asana client
    const client = Asana.ApiClient.instance;
    const token = client.authentications['token'];
    token.accessToken = accessToken;
    
    this.tasksApi = new Asana.TasksApi();
    this.sectionsApi = new Asana.SectionsApi();
  }
  
  /**
   * Create a new task in Asana
   * @param {string} sectionGid - Section GID where task should be created
   * @param {object} taskData - Task data
   * @param {string} taskData.name - Task name (required)
   * @param {string} taskData.notes - Task description/notes
   * @param {object} taskData.customFields - Custom field values (field GID -> value)
   * @param {string} taskData.assignee - Assignee GID (optional)
   * @returns {Promise<object>} Created task object
   */
  async createTask(sectionGid, taskData) {
    try {
      console.log(`Creating task "${taskData.name}" in section ${sectionGid}`);
      
      const task = await this.tasksApi.createTask({
        data: {
          name: taskData.name,
          notes: taskData.notes || '',
          projects: [this.projectId],
          memberships: [{
            project: this.projectId,
            section: sectionGid
          }],
          custom_fields: taskData.customFields || {},
          assignee: taskData.assignee || undefined
        }
      });
      
      console.log(`✅ Created task ${task.data.gid}`);
      return task.data;
    } catch (error) {
      console.error(`❌ Error creating task:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update an existing task
   * @param {string} taskGid - Task GID to update
   * @param {object} taskData - Updated task data
   * @param {string} taskData.name - Task name
   * @param {string} taskData.notes - Task description/notes
   * @param {object} taskData.customFields - Custom field values
   * @param {string} taskData.assignee - Assignee GID
   * @returns {Promise<object>} Updated task object
   */
  async updateTask(taskGid, taskData) {
    try {
      console.log(`Updating task ${taskGid}`);
      
      const updateData = {};
      
      if (taskData.name !== undefined) {
        updateData.name = taskData.name;
      }
      
      if (taskData.notes !== undefined) {
        updateData.notes = taskData.notes;
      }
      
      if (taskData.customFields) {
        updateData.custom_fields = taskData.customFields;
      }
      
      if (taskData.assignee !== undefined) {
        updateData.assignee = taskData.assignee;
      }
      
      const task = await this.tasksApi.updateTask(taskGid, {
        data: updateData
      });
      
      console.log(`✅ Updated task ${taskGid}`);
      return task.data;
    } catch (error) {
      console.error(`❌ Error updating task ${taskGid}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Move a task to a different section (changes status)
   * @param {string} taskGid - Task GID to move
   * @param {string} sectionGid - Target section GID
   * @returns {Promise<void>}
   */
  async moveToSection(taskGid, sectionGid) {
    try {
      console.log(`Moving task ${taskGid} to section ${sectionGid}`);
      
      await this.sectionsApi.addTaskForSection(sectionGid, {
        data: { task: taskGid }
      });
      
      console.log(`✅ Moved task to section`);
    } catch (error) {
      console.error(`❌ Error moving task to section:`, error.message);
      throw error;
    }
  }
  
  /**
   * Mark a task as complete
   * Used when a Slack List item is deleted
   * @param {string} taskGid - Task GID to complete
   * @returns {Promise<object>} Updated task object
   */
  async completeTask(taskGid) {
    try {
      console.log(`Completing task ${taskGid}`);
      
      const task = await this.tasksApi.updateTask(taskGid, {
        data: { completed: true }
      });
      
      console.log(`✅ Completed task ${taskGid}`);
      return task.data;
    } catch (error) {
      console.error(`❌ Error completing task ${taskGid}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Delete a task (permanent removal)
   * Use with caution - prefer completeTask() instead
   * @param {string} taskGid - Task GID to delete
   * @returns {Promise<void>}
   */
  async deleteTask(taskGid) {
    try {
      console.log(`Deleting task ${taskGid}`);
      
      await this.tasksApi.deleteTask(taskGid);
      
      console.log(`✅ Deleted task ${taskGid}`);
    } catch (error) {
      console.error(`❌ Error deleting task ${taskGid}:`, error.message);
      throw error;
    }
  }
}

module.exports = AsanaWriter;

