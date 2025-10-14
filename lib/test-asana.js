const Asana = require('asana');

// Provided credentials
const ASANA_ACCESS_TOKEN = '2/1211530436603309/1211641595595729:b86a8ba3f09dc894a8dcd6c975fa2da6';
const ASANA_PROJECT_ID = '1211635085103429';

async function testAsanaData() {
  console.log('🔍 Connecting to Asana API...\n');
  
  // Initialize API client
  const client = Asana.ApiClient.instance;
  const token = client.authentications['token'];
  token.accessToken = ASANA_ACCESS_TOKEN;
  
  // Create API instances
  const projectsApi = new Asana.ProjectsApi();
  const sectionsApi = new Asana.SectionsApi();
  const tasksApi = new Asana.TasksApi();
  const customFieldsApi = new Asana.CustomFieldsApi();
  
  try {
    // 1. Fetch project details
    console.log('📋 Fetching project details...');
    const projectResponse = await projectsApi.getProject(ASANA_PROJECT_ID, {});
    const project = projectResponse.data;
    console.log('\n=== PROJECT INFO ===');
    console.log(`Name: ${project.name}`);
    console.log(`GID: ${project.gid}`);
    console.log(`Workspace: ${project.workspace ? project.workspace.name : 'N/A'} (${project.workspace ? project.workspace.gid : 'N/A'})`);
    console.log(`\nFull project data:`);
    console.log(JSON.stringify(project, null, 2));
    
    // 2. Fetch sections
    console.log('\n\n📑 Fetching sections...');
    const sectionsResponse = await sectionsApi.getSectionsForProject(ASANA_PROJECT_ID, {});
    const sections = sectionsResponse.data;
    console.log('\n=== SECTIONS ===');
    sections.forEach((section, idx) => {
      console.log(`${idx + 1}. ${section.name} (GID: ${section.gid})`);
    });
    console.log(`\nFull sections data:`);
    console.log(JSON.stringify(sections, null, 2));
    
    // 3. Fetch custom fields for the project
    console.log('\n\n📊 Fetching project custom fields...');
    const projectDetailsResponse = await projectsApi.getProject(ASANA_PROJECT_ID, {
      opt_fields: 'custom_fields,custom_fields.name,custom_fields.type,custom_fields.enum_options,custom_fields.enum_options.name,custom_fields.enum_options.color'
    });
    const projectDetails = projectDetailsResponse.data;
    console.log('\n=== CUSTOM FIELDS ===');
    if (projectDetails.custom_fields && projectDetails.custom_fields.length > 0) {
      projectDetails.custom_fields.forEach((field, idx) => {
        console.log(`\n${idx + 1}. ${field.name} (GID: ${field.gid})`);
        console.log(`   Type: ${field.type}`);
        if (field.enum_options && field.enum_options.length > 0) {
          console.log(`   Options:`);
          field.enum_options.forEach(opt => {
            console.log(`     - ${opt.name} (${opt.color || 'no color'})`);
          });
        }
      });
      console.log(`\nFull custom fields data:`);
      console.log(JSON.stringify(projectDetails.custom_fields, null, 2));
    } else {
      console.log('No custom fields found on this project.');
    }
    
    // 4. Fetch tasks with all fields
    console.log('\n\n✅ Fetching tasks...');
    const tasksResponse = await tasksApi.getTasksForProject(ASANA_PROJECT_ID, {
      opt_fields: 'name,completed,assignee,assignee.name,assignee.email,due_on,custom_fields,custom_fields.name,custom_fields.type,custom_fields.enum_value,custom_fields.enum_value.name,custom_fields.number_value,custom_fields.text_value,memberships.section,memberships.section.name,notes,created_at,modified_at,permalink_url'
    });
    const tasks = tasksResponse.data;
    
    console.log(`\n=== TASKS ===`);
    console.log(`Total tasks found: ${tasks.length}`);
    
    // Group by section
    console.log('\n--- Tasks by Section ---');
    sections.forEach(section => {
      const tasksInSection = tasks.filter(t => 
        t.memberships?.some(m => m.section?.gid === section.gid)
      );
      console.log(`\n${section.name}: ${tasksInSection.length} tasks`);
      tasksInSection.slice(0, 3).forEach(task => {
        console.log(`  - ${task.name}${task.completed ? ' ✓' : ''}`);
        if (task.assignee) {
          console.log(`    Assignee: ${task.assignee.name}`);
        }
      });
      if (tasksInSection.length > 3) {
        console.log(`  ... and ${tasksInSection.length - 3} more`);
      }
    });
    
    // Show detailed sample tasks
    console.log('\n\n--- Sample Task Details (first 2) ---');
    tasks.slice(0, 2).forEach((task, idx) => {
      console.log(`\n${idx + 1}. ${task.name}`);
      console.log(`   GID: ${task.gid}`);
      console.log(`   Completed: ${task.completed}`);
      console.log(`   Assignee: ${task.assignee ? task.assignee.name : 'Unassigned'}`);
      console.log(`   Due: ${task.due_on || 'No due date'}`);
      console.log(`   Section: ${task.memberships?.[0]?.section?.name || 'No section'}`);
      if (task.custom_fields && task.custom_fields.length > 0) {
        console.log(`   Custom Fields:`);
        task.custom_fields.forEach(cf => {
          let value = 'None';
          if (cf.enum_value) value = cf.enum_value.name;
          else if (cf.number_value !== null && cf.number_value !== undefined) value = cf.number_value;
          else if (cf.text_value) value = cf.text_value;
          console.log(`     - ${cf.name}: ${value}`);
        });
      }
    });
    
    console.log('\n\n--- Full Task Data (first 2) ---');
    console.log(JSON.stringify(tasks.slice(0, 2), null, 2));
    
    // 5. Summary
    console.log('\n\n=== SUMMARY ===');
    console.log(`Project: ${project.name}`);
    console.log(`Workspace: ${project.workspace ? project.workspace.name : 'N/A'}`);
    console.log(`Sections: ${sections.length}`);
    console.log(`Custom Fields: ${projectDetails.custom_fields?.length || 0}`);
    console.log(`Total Tasks: ${tasks.length}`);
    console.log(`Completed Tasks: ${tasks.filter(t => t.completed).length}`);
    console.log(`Active Tasks: ${tasks.filter(t => !t.completed).length}`);
    
    console.log('\n✅ Test complete! Review the output above to understand your Asana data structure.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.value) {
      console.error('Error details:', JSON.stringify(error.value, null, 2));
    }
  }
}

testAsanaData();

