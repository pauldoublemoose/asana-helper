# Asana to Slack List Sync

Syncs an Asana bug board to a native Slack List with automatic updates.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Test Asana connection:
   ```bash
   npm test
   ```

3. Configure environment variables (see `.env.example`)

4. Run the bot:
   ```bash
   npm start
   ```

## Development

- `test-asana.js` - Test script to examine Asana data structure
- `schema.js` - Slack List schema definition
- `sync.js` - Asana ↔ Slack sync logic
- `index.js` - Main Slack Bolt app

