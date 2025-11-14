# How to Start the Application

This guide explains how to start both the frontend and backend servers.

---

## Quick Start (Recommended)

If you have both frontend and backend set up, run this **one command from the root directory**:

```bash
cd /Users/anish47/Documents/Projects/Fraud\ Detection/emergent-app
npm start
```

This starts **both servers simultaneously**:
- Frontend at `http://localhost:3000`
- Backend at `http://localhost:8000`

---

## Individual Commands Explained

### Command 1: `npm start` (Frontend)

**What it does:**
- Starts the React frontend development server
- Runs on `http://localhost:3000`
- Automatically reloads when you change code
- Opens in your default browser

**Full command:**
```bash
npm start
```

**What's happening behind the scenes:**
```bash
# npm start actually runs:
cd frontend && npm start

# Which runs:
cd frontend && craco start

# This uses:
# - craco: Create React App with custom webpack config
# - Webpack: Bundles React code
# - Dev Server: Serves files with hot reload
```

**What you'll see:**
```
Compiled successfully!

You can now view fraud-detection-app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.x:3000
```

**When to use it:**
- Developing the frontend
- Testing UI changes
- Want auto-reload on code changes

---

### Command 2: `uvicorn server:app --reload --port 8000` (Backend)

**What it does:**
- Starts the Python FastAPI backend server
- Runs on `http://localhost:8000`
- Automatically reloads when you change Python code
- Listens for HTTP and WebSocket requests

**Full command:**
```bash
cd backend
python3 -m uvicorn server:app --reload --port 8000
```

**Breaking it down:**
- `cd backend` — Navigate to backend directory
- `python3` — Use Python 3 (not Python 2)
- `-m uvicorn` — Run the uvicorn module
- `server:app` — Look for `app` variable in `server.py` file
- `--reload` — Auto-restart when code changes
- `--port 8000` — Listen on port 8000

**What you'll see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**When to use it:**
- Developing the backend
- Testing API endpoints
- Want auto-reload on code changes

---

## Step-by-Step: Manual Start (If npm start doesn't work)

### Option A: Start in Separate Terminals

**Terminal 1 - Start Backend:**
```bash
cd /Users/anish47/Documents/Projects/Fraud\ Detection/emergent-app/backend
python3 -m uvicorn server:app --reload --port 8000
```

**Terminal 2 - Start Frontend:**
```bash
cd /Users/anish47/Documents/Projects/Fraud\ Detection/emergent-app/frontend
npm start
```

Wait for both to say "compiled successfully" and "startup complete".

### Option B: Start Both Automatically

From the **root directory** of the project:

```bash
npm start
```

This runs both commands using `concurrently` (handles multiple processes).

---

## Troubleshooting

### Frontend won't start with `npm start`

**Error:** `npm ERR! code ENOENT`

**Fix:**
```bash
# Make sure you're in the right directory
cd /Users/anish47/Documents/Projects/Fraud\ Detection/emergent-app

# Or navigate from root
cd frontend && npm start
```

### Backend won't start with `uvicorn`

**Error:** `sh: python3: command not found`

**Fix:**
```bash
# Install Python
brew install python3

# Or check if it's installed
which python3
python3 --version
```

**Error:** `Address already in use`

**Fix:**
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use a different port
python3 -m uvicorn server:app --reload --port 8001
```

### Port 3000 already in use

**Fix:**
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or start on different port
cd frontend && PORT=3001 npm start
```

### Both services running but can't connect

**Check:**
1. Are both running?
   ```bash
   # Terminal 1 should say:
   # INFO:     Uvicorn running on http://127.0.0.1:8000
   
   # Terminal 2 should say:
   # Compiled successfully!
   # http://localhost:3000
   ```

2. Test backend directly:
   ```bash
   curl http://localhost:8000/
   # Should return: {"message":"Backend is running!"}
   ```

3. Check frontend `.env`:
   ```bash
   cat frontend/.env
   # Should have:
   # REACT_APP_BACKEND_URL=http://localhost:8000
   ```

---

## What Each Server Does

### Frontend Server (npm start on port 3000)

**Responsibilities:**
- Displays the web interface
- Handles user interactions
- Runs React components
- Makes API calls to backend

**Files it serves:**
- HTML, CSS, JavaScript
- Images, fonts
- React components

**Routes it serves:**
- `/` — Landing page
- `/login` — Login page
- `/register` — Registration page
- `/dashboard` — Main dashboard
- `/alerts` — Alerts page
- `/transactions` — Transactions page
- `/rules` — Rules page

### Backend Server (uvicorn on port 8000)

**Responsibilities:**
- Authenticates users
- Manages transactions
- Processes fraud rules
- Creates alerts
- Handles real-time WebSocket events

**API Routes:**
- `/api/auth/login` — User login
- `/api/auth/register` — User registration
- `/api/auth/me` — Get current user
- `/api/alerts` — List/manage alerts
- `/api/transactions` — List/create transactions
- `/api/rules` — List/create/update rules
- `/socket.io/` — WebSocket for real-time alerts

---

## Checking if Servers are Running

### Check if Frontend is Running
```bash
# Should return HTML
curl http://localhost:3000

# Or open in browser
open http://localhost:3000
```

### Check if Backend is Running
```bash
# Should return JSON
curl http://localhost:8000/

# Expected response:
# {"message":"Backend is running!"}

# Test an endpoint
curl http://localhost:8000/api/health

# Expected response:
# {"status":"ok","service":"fraud-detection-mock","timestamp":"2025-11-14T..."}
```

---

## Common Scenarios

### Scenario 1: First Time Setup

```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Go back to backend
cd ../backend

# 3. Install Python dependencies
python3 -m pip install -r requirements.txt

# 4. Go to root
cd ..

# 5. Start everything
npm start
```

### Scenario 2: Only Developing Backend

```bash
# Just start backend
cd backend
python3 -m uvicorn server:app --reload --port 8000

# Test with curl
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jordan@example.com","password":"password123"}'
```

### Scenario 3: Only Developing Frontend

```bash
# Make sure backend is already running on port 8000
# Then start frontend
cd frontend
npm start

# Frontend will automatically call http://localhost:8000
```

### Scenario 4: Deploy Mode (Production)

```bash
# Build frontend for production
cd frontend
npm run build

# This creates optimized files in frontend/build/
# Upload these files to a web server
```

---

## Environment Variables

### Frontend (.env)

Located at `frontend/.env`

```bash
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
WDS_SOCKET_PORT=3000
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

**To change where frontend calls backend:**
- Edit `REACT_APP_BACKEND_URL`
- Must restart frontend with `npm start`

### Backend (.env)

Located at `backend/.env`

```bash
DATABASE_URL="postgresql://fraudadmin:fraud_password_123@localhost:5432/fraud_detection"
DB_SYNC=true
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
NODE_ENV=development
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRY=7d
```

---

## Performance Tips

### Speed Up Frontend Startup
```bash
# Clear node_modules cache
rm -rf frontend/node_modules
npm ci --in-frontend

# Or use npm cache
npm cache clean --force
```

### Speed Up Backend Startup
```bash
# Use uvicorn workers for production
python3 -m uvicorn server:app --workers 4 --port 8000

# But for development, use --reload
python3 -m uvicorn server:app --reload --port 8000
```

---

## Logs and Debugging

### Frontend Logs
Open DevTools in browser:
- `F12` or `Cmd+Option+I` (Mac)
- Console tab shows JavaScript errors
- Network tab shows API calls
- Application tab shows cookies

### Backend Logs
Look at terminal where you ran `uvicorn`:
```
INFO:     127.0.0.1:59334 - "GET /api/auth/me HTTP/1.1" 401 Unauthorized
INFO:     127.0.0.1:59388 - "GET /api/alerts HTTP/1.1" 401 Unauthorized
```

**Meaning:**
- `INFO` — Informational message
- `127.0.0.1:59334` — Client IP and port
- `GET /api/alerts` — HTTP method and path
- `401 Unauthorized` — Status code and message

---

## Stop the Servers

### Stop All Services
```bash
npm run stop
```

Or manually:

**Terminal 1 (Backend):**
- Press `Ctrl+C`

**Terminal 2 (Frontend):**
- Press `Ctrl+C`

---

## Quick Reference

| Task | Command |
|------|---------|
| Start everything | `npm start` from root |
| Start only backend | `cd backend && python3 -m uvicorn server:app --reload --port 8000` |
| Start only frontend | `cd frontend && npm start` |
| Stop all services | `npm run stop` |
| Test backend | `curl http://localhost:8000/` |
| Test frontend | `open http://localhost:3000` |
| Check running processes | `ps aux \| grep -E 'uvicorn\|npm'` |
| Kill backend | `lsof -i :8000 && kill -9 <PID>` |
| Kill frontend | `lsof -i :3000 && kill -9 <PID>` |

---

**Last Updated:** November 14, 2025
