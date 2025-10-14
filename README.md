# MooseBot - Asana ↔ Slack List Sync

**Bidirectional real-time synchronization between Asana bug boards and Slack Lists**

MooseBot keeps your Asana bug board and Slack List perfectly in sync, using event-driven webhooks for instant updates in both directions.

## Features

✅ **Instant bidirectional sync** - Changes appear immediately in both platforms  
✅ **Event-driven architecture** - RTM WebSocket + HTTP webhooks (no polling)  
✅ **Echo prevention** - Smart detection prevents infinite update loops  
✅ **Field mapping** - Syncs all custom fields (priority, severity, platform, etc.)  
✅ **Railway deployment** - Always-on server with auto-restarts  
✅ **Simple setup** - Deploy in 15 minutes

## How It Works

```
User edits in Slack → Slack file_change event → Update Asana task
User edits in Asana → Asana webhook → Update Slack List item
```

**Both directions work simultaneously and instantly!**

## Architecture

- **Slack RTM API** - WebSocket connection for real-time `file_change` events
- **Asana Webhooks** - HTTP callbacks for task changes
- **Echo Detection** - Timestamp-based system prevents loops
- **Railway Server** - Always-on Node.js server (~$2-3/month)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/MooseBot.git
cd MooseBot
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
# Edit .env with your credentials
```

Required variables:
- `ASANA_ACCESS_TOKEN` - Your Asana Personal Access Token
- `ASANA_PROJECT_ID` - Your bug board project GID
- `SLACK_BOT_TOKEN` - Your Slack bot token (with `lists:read`, `lists:write`, `files:read`)
- `SLACK_LIST_ID` - Your Slack List ID

### 3. Deploy to Railway

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

**Summary:**
1. Push to GitHub
2. Connect Railway to your repo
3. Add environment variables
4. Railway auto-deploys
5. Register Asana webhook: `npm run register-webhook`
6. Done! 🎉

## Project Structure

```
MooseBot/
├── src/
│   ├── server.js                    # Main Railway server (RTM + Express)
│   ├── asana/
│   │   └── asana-writer.js          # Asana write operations
│   ├── transformers/
│   │   ├── slack-to-asana.js        # Slack → Asana transform
│   │   └── asana-to-slack.js        # Asana → Slack transform
│   ├── utils/
│   │   └── echo-detector.js         # Prevent infinite loops
│   └── setup/
│       └── register-asana-webhook.js # Webhook registration
├── asana-helper/                     # Helper scripts and utilities
├── package.json
├── DEPLOYMENT.md                     # Detailed deployment guide
└── README.md                         # This file
```

## Development

### Run Locally

```bash
npm start
```

Server starts on port 3000. You'll need ngrok or similar to receive Asana webhooks locally.

### Test Scripts

```bash
npm run test-asana    # Fetch Asana project data
npm run test-slack    # Test Slack Lists API
```

### Register Webhook

```bash
RAILWAY_PUBLIC_URL=https://your-app.railway.app npm run register-webhook
```

## Field Mappings

**Synced fields:**
- Bug Name (primary)
- Status (mapped to Asana sections)
- Priority (Low, Medium, High, Critical)
- Severity (Low, Medium, High, Critical)
- Bug Category (Code, Level Design, Game Design, etc.)
- Platform (PC, Xbox, PS4, PS5, Switch, VR)
- Repro Rate (100%, 75%, 50%, 25%)
- Version (text field)
- Regression Status (Bug Fixed, Bug Still Occurs)
- Assignee (TODO: user mapping)
- Asana Link (for reference)
- Created Date

## Monitoring

### Health Check

```bash
curl https://your-app.railway.app/health
```

### Railway Logs

View real-time logs in Railway dashboard:
- RTM connection status
- Sync events
- Errors and warnings

### Log Messages

- `📝 Slack List changed` - Detected change in Slack
- `📬 Received X Asana webhook events` - Asana webhook received
- `✅ Updated Asana task` - Successfully synced to Asana
- `✅ Updated Slack item` - Successfully synced to Slack
- `⏭️ Echo detected` - Prevented infinite loop
- `❌ Error` - Something went wrong

## Troubleshooting

**Slack → Asana not working?**
- Check RTM connection: `curl https://your-app.railway.app/health`
- Verify `SLACK_BOT_TOKEN` has `files:read` scope
- Check Railway logs for errors

**Asana → Slack not working?**
- Verify webhook is registered: check Asana project settings
- Test webhook endpoint: `curl https://your-app.railway.app/asana-webhook`
- Check `ASANA_WEBHOOK_SECRET` is set in Railway

**Items duplicating?**
- Check echo detector logs (should see "echo detected")
- Verify TTL is sufficient (default 10 seconds)
- Clear and restart server

See [DEPLOYMENT.md](DEPLOYMENT.md) for more troubleshooting tips.

## Cost

**Railway Free Tier:**
- $5 credit per month
- This app costs ~$1.50-3.00/month
- **Free tier is sufficient!**

## Security

- Never commit `.env` to Git
- Store secrets in Railway environment variables only
- Webhook signature verification enabled
- Rotate tokens periodically

## Limitations

- **User mapping not implemented** - Assignee field not synced yet
- **One-way deletions** - Slack delete → Asana complete (not delete)
- **Echo detection window** - 10 second window, may miss very rapid updates
- **No conflict resolution** - Last update wins (by design)

## Future Enhancements

- [ ] Asana user → Slack user mapping
- [ ] Bulk initial sync command
- [ ] Slack slash commands for manual sync
- [ ] Conflict resolution strategies
- [ ] Sync status notifications
- [ ] Multiple project support

## Contributing

Issues and PRs welcome! Please:
1. Test locally first
2. Update documentation
3. Follow existing code style

## License

MIT

## Credits

Built for syncing Asana bug boards with Slack Lists using modern event-driven architecture.
