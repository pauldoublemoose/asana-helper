# Asana Bug Board Analysis

## Project Details
- **Name:** LMS - QA Board
- **Workspace:** rawfury.com
- **Project GID:** 1211635085103429
- **Workspace GID:** 1123805143377851

## Sections (8)
1. **Important Info** (1211636939835137)
2. **Open Bugs** (1211636939835139) - Main active bug section
3. **In progress** (1211636939835141)
4. **Regression** (1211636939835143) - Bugs that returned
5. **Fixed** (1211635085103433)
6. **Closed** (1211636939835145)
7. **Needs more info** (1211636939851139)
8. **Community Reports** (1211636939851141)

## Custom Fields (7)

### 1. Bug Category (Enum)
- **GID:** 1211636938617208
- **Options:**
  - Code (green)
  - Level Design (red)
  - Game Design (blue-green)
  - Visual Art (orange)
  - Audio (yellow-orange)
  - Text (yellow)
  - First-Party Requirement (aqua)

### 2. Priority (Enum)
- **GID:** 1211636939819718
- **Options:**
  - Low (green)
  - Medium (yellow)
  - High (orange)
  - Critical (red)

### 3. Severity (Enum)
- **GID:** 1211636939819733
- **Options:**
  - Low (green)
  - Medium (yellow)
  - High (orange)
  - Critical (red)

### 4. Repro Rate (Enum)
- **GID:** 1211636939828926
- **Options:**
  - 100% (red)
  - 75% (orange)
  - 50% (yellow-orange)
  - 25% and less (yellow-green)

### 5. Version (in-game) (Text)
- **GID:** 1211636939828941
- Free text field for version numbers

### 6. Platform (Enum)
- **GID:** 1211636939828948
- **Options:**
  - PC (Steam, GOG, Epic) (green)
  - Xbox One (red)
  - Xbox Series (orange)
  - PS4 (yellow-orange)
  - PS5 (yellow)
  - Switch (yellow-green)
  - VR (blue-green)

### 7. Regression Status (Enum)
- **GID:** 1211636939835126
- **Options:**
  - Bug fixed (green)
  - Bug still occurs (red)

## Slack List Schema Mapping

The schema has been designed to mirror all Asana fields:

1. **Bug Name** (text, primary column)
2. **Status** (select) - Maps to Asana sections
3. **Bug Category** (select)
4. **Priority** (select)
5. **Severity** (select)
6. **Repro Rate** (select)
7. **Platform** (select)
8. **Version** (text)
9. **Assignee** (user) - Will require Asana→Slack user mapping
10. **Regression Status** (select)
11. **View in Asana** (link) - Direct link to task
12. **Created** (date) - When bug was reported

## Next Steps

### Phase 3: Build Sync Engine
- Fetch all tasks from Asana
- Create/update/delete items in Slack List
- Handle user mapping (Asana GID → Slack user ID)
- Cache to respect rate limits

### Phase 4: Slack Bot
- Create Slack List with schema
- Add manual sync command
- Optional: Add bug creation modal

### Phase 5: Deploy to Vercel
- Configure cron for automatic sync (every 15-30 min)
- Set up environment variables
- Test in production

## Notes

- Currently only 1 test task in the board (in "Closed" section)
- All custom fields are properly structured
- Colors match between Asana and Slack (mostly)
- User mapping will be important for assignee field

