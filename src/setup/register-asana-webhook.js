require('dotenv').config();
const Asana = require('asana');

/**
 * Register Asana Webhook
 * 
 * This script registers a webhook with Asana to receive real-time notifications
 * when tasks change in the bug board project.
 * 
 * Run this AFTER deploying to Railway so you have a public URL.
 * 
 * Usage:
 *   node src/setup/register-asana-webhook.js
 * 
 * Environment variables required:
 *   - ASANA_ACCESS_TOKEN
 *   - ASANA_PROJECT_ID
 *   - RAILWAY_PUBLIC_URL (or manually set the target URL)
 */

async function registerWebhook() {
  try {
    console.log('🔧 Registering Asana webhook...');
    
    // Check required environment variables
    if (!process.env.ASANA_ACCESS_TOKEN) {
      throw new Error('ASANA_ACCESS_TOKEN environment variable is required');
    }
    
    if (!process.env.ASANA_PROJECT_ID) {
      throw new Error('ASANA_PROJECT_ID environment variable is required');
    }
    
    // Determine webhook target URL
    let targetUrl;
    if (process.env.RAILWAY_PUBLIC_URL) {
      targetUrl = `${process.env.RAILWAY_PUBLIC_URL}/asana-webhook`;
    } else if (process.env.WEBHOOK_URL) {
      targetUrl = process.env.WEBHOOK_URL;
    } else {
      throw new Error('Either RAILWAY_PUBLIC_URL or WEBHOOK_URL environment variable is required');
    }
    
    console.log(`Target URL: ${targetUrl}`);
    console.log(`Project ID: ${process.env.ASANA_PROJECT_ID}`);
    
    // Initialize Asana client
    const client = Asana.ApiClient.instance;
    const token = client.authentications['token'];
    token.accessToken = process.env.ASANA_ACCESS_TOKEN;
    
    const webhooksApi = new Asana.WebhooksApi();
    
    // Create webhook with filters
    console.log('Sending webhook creation request...');
    const webhook = await webhooksApi.createWebhook({
      data: {
        resource: process.env.ASANA_PROJECT_ID,
        target: targetUrl,
        filters: [
          {
            resource_type: 'task',
            action: 'changed'
          },
          {
            resource_type: 'task',
            action: 'added'
          },
          {
            resource_type: 'task',
            action: 'removed'
          },
          {
            resource_type: 'task',
            action: 'deleted'
          }
        ]
      }
    });
    
    console.log('✅ Webhook registered successfully!');
    console.log('');
    console.log('Webhook details:');
    console.log('  GID:', webhook.data.gid);
    console.log('  Resource:', webhook.data.resource.gid);
    console.log('  Target:', webhook.data.target);
    console.log('  Active:', webhook.data.active);
    console.log('');
    console.log('🔑 IMPORTANT: Save this webhook secret to your environment variables:');
    console.log('');
    console.log(`  ASANA_WEBHOOK_SECRET=${webhook['X-Hook-Secret'] || 'NOT_PROVIDED'}`);
    console.log('');
    console.log('Add this to your Railway environment variables and restart the server.');
    console.log('');
    
    return webhook;
    
  } catch (error) {
    console.error('❌ Failed to register webhook:', error.message);
    
    if (error.value) {
      console.error('Error details:', JSON.stringify(error.value, null, 2));
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  registerWebhook();
}

module.exports = registerWebhook;

