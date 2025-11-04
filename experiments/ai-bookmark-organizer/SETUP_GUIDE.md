# AI Bookmark Organizer - Complete Setup Guide

This guide will walk you through setting up the entire AI Bookmark Organizer system from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Chrome Extension Setup](#chrome-extension-setup)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** 18+ and npm ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Git** (for cloning pgvector)
- **Chrome** Browser
- **OpenRouter API Key** ([Get one free](https://openrouter.ai/keys))

### Check Installations
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
psql --version  # Should be v14 or higher
```

## Database Setup

### Step 1: Install PostgreSQL

#### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### Step 2: Install pgvector Extension

```bash
# Clone pgvector repository
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# Build and install
make
sudo make install  # May require admin password
```

### Step 3: Create Database

```bash
# Access PostgreSQL as postgres user
sudo -u postgres psql

# Or on macOS/Windows:
psql -U postgres

# Inside psql:
CREATE DATABASE bookmarks_ai;
CREATE USER bookmark_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bookmarks_ai TO bookmark_user;
\q
```

### Step 4: Initialize Schema

```bash
# Navigate to the experiment directory
cd experiments/ai-bookmark-organizer

# Run schema file
psql -U bookmark_user -d bookmarks_ai -f database/schema.sql

# Or:
PGPASSWORD=your_secure_password psql -U bookmark_user -d bookmarks_ai -f database/schema.sql
```

### Step 5: Verify Database Setup

```bash
psql -U bookmark_user -d bookmarks_ai

# Inside psql:
\dt  # Should show tables: bookmarks, categories, tags, etc.
\dx  # Should show vector extension
SELECT * FROM categories;  # Should show default categories
\q
```

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd experiments/ai-bookmark-organizer/backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Express (web framework)
- PostgreSQL client (pg)
- pgvector support
- Axios (HTTP client)
- And other dependencies

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Update `.env` with your settings:**

```env
# Database Configuration
DATABASE_URL=postgresql://bookmark_user:your_secure_password@localhost:5432/bookmarks_ai

# Server Configuration
PORT=3000
NODE_ENV=development

# OpenRouter API (optional - can be set in extension)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# AI Configuration
DEFAULT_AI_MODEL=anthropic/claude-3.5-sonnet
DEFAULT_EMBEDDING_MODEL=openai/text-embedding-ada-002

# CORS Configuration
ALLOWED_ORIGINS=chrome-extension://your-extension-id,http://localhost:3000

# Feature Flags
ENABLE_PAGE_CONTENT_FETCH=true
ENABLE_AI_AUTO_CATEGORIZE=true
MAX_CONTENT_LENGTH=50000
```

### Step 4: Test Database Connection

```bash
# Start the server
npm start
```

You should see:
```
✓ Connected to PostgreSQL database
✓ pgvector extension initialized

╔════════════════════════════════════════════════╗
║   AI Bookmark Organizer API Server            ║
║   Running on http://localhost:3000             ║
║   Environment: development                     ║
╚════════════════════════════════════════════════╝
```

### Step 5: Test API Endpoints

Open another terminal and test:

```bash
# Health check
curl http://localhost:3000/health

# Should return: {"status":"healthy", ...}

# Get categories
curl http://localhost:3000/api/categories

# Should return: {"success":true,"data":[...]}
```

Keep the backend server running for the extension to work.

## Chrome Extension Setup

### Step 1: Prepare Extension Icons (Optional)

If you want custom icons:

```bash
cd experiments/ai-bookmark-organizer/extension/icons

# Create placeholder icons (requires ImageMagick)
convert -size 16x16 xc:#4f46e5 -pointsize 10 -fill white -gravity center -annotate +0+0 "AI" icon16.png
convert -size 32x32 xc:#4f46e5 -pointsize 20 -fill white -gravity center -annotate +0+0 "AI" icon32.png
convert -size 48x48 xc:#4f46e5 -pointsize 30 -fill white -gravity center -annotate +0+0 "AI" icon48.png
convert -size 128x128 xc:#4f46e5 -pointsize 80 -fill white -gravity center -annotate +0+0 "AI" icon128.png
```

Or just skip this - Chrome will use a default icon.

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"**

4. Navigate to and select: `experiments/ai-bookmark-organizer/extension/`

5. The extension should now appear in your extensions list

6. Pin the extension to your toolbar (optional):
   - Click the puzzle piece icon (Extensions)
   - Find "AI Bookmark Organizer"
   - Click the pin icon

### Step 3: Get Extension ID

Once loaded, note the extension ID (it looks like: `abcdefghijklmnopqrstuvwxyz123456`)

You'll need this for CORS configuration.

## Configuration

### Step 1: Configure the Extension

1. Click the extension icon in Chrome
2. Click the settings gear icon (⚙️)
3. Or right-click extension → "Options"

### Step 2: Enter Settings

**API Configuration:**
- **OpenRouter API Key**: Get from [openrouter.ai/keys](https://openrouter.ai/keys)
  - Free tier available with rate limits
  - Supports multiple models
  - Example: `sk-or-v1-xxxxxxxxxxxxxxxxxx`

- **Backend API URL**: `http://localhost:3000`

- **AI Model**: Choose from dropdown
  - Recommended: `anthropic/claude-3.5-sonnet`
  - Budget: `anthropic/claude-3-haiku`

**Feature Settings:**
- ✅ Automatically organize new bookmarks with AI
- ✅ Fetch page content for better analysis
- ✅ Show notifications for bookmark actions

**Advanced Settings:**
- Semantic Search Similarity Threshold: 0.7 (default)
- Maximum AI Suggestions: 5

### Step 3: Update Backend CORS (Important!)

Edit `backend/.env` and add your extension ID:

```env
ALLOWED_ORIGINS=chrome-extension://your-actual-extension-id-here,http://localhost:3000
```

Restart the backend server:
```bash
# Press Ctrl+C to stop, then:
npm start
```

### Step 4: Verify Connection

In the extension options page, after saving settings, you should see:
```
✅ Backend connection successful!
```

If not, check:
- Backend server is running (`http://localhost:3000/health`)
- API URL is correct
- No firewall blocking localhost

## Testing

### Test 1: Save a Bookmark

1. Visit any website (e.g., https://github.com)
2. Click the extension icon
3. Click "➕ Save Current Page"
4. Wait for AI analysis
5. Review the suggested category
6. Click "Save Bookmark"

Expected result:
- Bookmark saved
- AI suggests a category
- Tags generated
- Notification shown

### Test 2: Search Bookmarks

1. Open extension popup
2. Type in search box: "github"
3. Press Enter or click 🔍

Expected result:
- Search results appear
- Relevant bookmarks shown

### Test 3: AI Semantic Search

1. Open extension popup
2. Enable "AI Semantic Search" toggle
3. Type: "code repositories"
4. Press Enter

Expected result:
- AI finds semantically similar bookmarks
- May find GitHub bookmarks even if they don't contain the exact words

### Test 4: AI Chat

1. Open extension popup
2. Click "AI Chat" tab
3. Type: "How should I organize my bookmarks?"
4. Click Send

Expected result:
- AI responds with suggestions
- Conversational interface works

### Test 5: Categories

1. Open extension popup
2. Click "Categories" tab
3. See default and AI-generated categories
4. Click a category to see bookmarks in it

### Test 6: Backend API

```bash
# Test bookmark creation
curl -X POST http://localhost:3000/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Example Site",
    "apiKey": "your-openrouter-key"
  }'

# Should return: {"success":true,"data":{...}}
```

## Troubleshooting

### Problem: Extension can't connect to backend

**Solutions:**
1. Check backend is running: `curl http://localhost:3000/health`
2. Check firewall isn't blocking port 3000
3. Verify API URL in extension settings
4. Check browser console for CORS errors (F12 → Console)
5. Verify extension ID in backend CORS settings

### Problem: Database connection failed

**Solutions:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `.env`
3. Test connection: `psql -U bookmark_user -d bookmarks_ai`
4. Check username/password are correct

### Problem: pgvector extension not found

**Solutions:**
1. Reinstall pgvector (see Database Setup)
2. Check PostgreSQL version (must be 11+)
3. Run: `psql -d bookmarks_ai -c "CREATE EXTENSION vector;"`

### Problem: OpenRouter API errors

**Solutions:**
1. Verify API key is valid at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Check you have credits/free tier available
3. Try a different model (e.g., switch from Claude to GPT-3.5)
4. Check API rate limits

### Problem: Extension not loading

**Solutions:**
1. Check for JavaScript errors in Chrome Extensions page
2. Verify all required files exist
3. Check manifest.json is valid JSON
4. Try reloading the extension

### Problem: Bookmarks not being analyzed

**Solutions:**
1. Check API key is configured
2. Verify backend logs for errors
3. Test AI endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/ai/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "bookmark": {"url": "https://example.com", "title": "Test"},
       "apiKey": "your-key"
     }'
   ```

### Problem: Slow performance

**Solutions:**
1. Disable "Fetch page content" in settings (faster but less accurate)
2. Use a faster model (claude-3-haiku instead of sonnet)
3. Check database has proper indexes (see schema.sql)
4. Reduce MAX_CONTENT_LENGTH in backend .env

### Viewing Logs

**Backend logs:**
```bash
# Running in terminal where you started npm start
# Or use:
npm run dev  # Uses nodemon for auto-reload and better logging
```

**Extension logs:**
```
1. Open Chrome
2. Press F12 (DevTools)
3. Click "Console" tab
4. Reload extension or perform action
5. Check for errors/warnings
```

**Background service worker logs:**
```
1. Go to chrome://extensions/
2. Find AI Bookmark Organizer
3. Click "service worker" link
4. Console opens showing background.js logs
```

## Next Steps

Now that everything is set up:

1. **Import existing bookmarks**: Options → Import Chrome Bookmarks
2. **Customize categories**: Add your own categories in the UI
3. **Experiment with AI models**: Try different models in settings
4. **Adjust similarity threshold**: Fine-tune semantic search accuracy
5. **Check the documentation**: Read README.md for advanced features

## Getting Help

- Check the [README.md](README.md) for more information
- Review [database/schema.sql](database/schema.sql) for database structure
- Look at API endpoints in [backend/routes/](backend/routes/)
- Inspect extension code in [extension/](extension/)

## Development Tips

### Run backend in development mode:
```bash
cd backend
npm run dev  # Auto-reloads on code changes
```

### Watch extension changes:
- After making changes to extension files
- Go to `chrome://extensions/`
- Click the refresh icon on your extension

### View database contents:
```bash
psql -U bookmark_user -d bookmarks_ai

SELECT * FROM bookmarks LIMIT 5;
SELECT * FROM categories;
SELECT * FROM bookmark_tags;
```

### Reset everything:
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE bookmarks_ai;"
psql -U postgres -c "CREATE DATABASE bookmarks_ai;"
psql -U bookmark_user -d bookmarks_ai -f database/schema.sql
```

---

**Congratulations!** 🎉 Your AI Bookmark Organizer is now fully set up and ready to use!
