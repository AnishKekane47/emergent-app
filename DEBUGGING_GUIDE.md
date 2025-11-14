# Debugging Guide - Common Issues & Solutions

This document outlines all the mistakes found during development and how to debug similar issues.

---

## 1. Python Command Not Found (Exit Code 127)

### Problem
```
sh: python: command not found
npm run start:backend exited with code 127
```

### Root Cause
- `python` command doesn't exist on macOS
- macOS comes with `python3`, not `python`
- The npm script was calling `python` instead of `python3`

### Solution
```json
// ✅ CORRECT: Use python3
"start:backend": "cd backend && python3 -m uvicorn server:app --reload --port 8000"

// ❌ WRONG: Don't use python
"start:backend": "cd backend && python -m uvicorn server:app --reload --port 8000"
```

### How to Debug
```bash
# Check which Python you have
which python3
which python

# Test the command
python3 --version
python --version  # Will fail

# Always use python3 on macOS
```

---

## 2. Backend 404 Not Found

### Problem
```
127.0.0.1:54137 - "POST /auth/register HTTP/1.1" 404 Not Found
```

### Root Cause
- Frontend was calling `/auth/register` 
- Backend routes were `/api/auth/register`
- Frontend API base was missing `/api` prefix

### Solution

**Frontend: `src/auth/api.ts`**
```typescript
// ❌ WRONG: Missing /api prefix
const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/auth`;

// ✅ CORRECT: Include /api
const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/auth`;
```

### How to Debug
1. **Check backend routes** - Look at `server.py` for the actual endpoint paths
2. **Check frontend calls** - Use browser DevTools → Network tab
3. **Verify the full URL** - Should match exactly: `http://localhost:8000/api/auth/login`

---

## 3. CORS Error with Credentials

### Problem
```
Access to XMLHttpRequest blocked by CORS policy
```

### Root Cause
- CORS `allow_origins=["*"]` with `allow_credentials=True` is invalid
- Browsers reject this combination
- Cannot use wildcard with credentials

### Solution

**Backend: `server.py`**
```python
# ❌ WRONG: Wildcard with credentials
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # INVALID!
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ CORRECT: Explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### How to Debug
- Check browser console for CORS errors
- Look at the `Allow-Origin` header in response
- Must match the frontend origin exactly

---

## 4. Authentication Failed - Session Cookie Not Sent

### Problem
```
INFO:     127.0.0.1:59334 - "GET /api/auth/me HTTP/1.1" 401 Unauthorized
```

### Root Cause
Multiple issues:
1. **Domain mismatch** - Frontend at `localhost:3000`, backend at `127.0.0.1:8000`
2. **SameSite=none without Secure flag** - Doesn't work on localhost
3. **No axios credentials config** - Frontend not sending cookies
4. **Auto-redirect on 401** - Caused infinite loops checking auth

### Solutions

#### Solution A: Axios Configuration
**Frontend: `src/api/axiosConfig.js`**
```javascript
// ❌ WRONG: Auto-redirect on 401 causes infinite loops
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';  // BAD: Loops on app load
    }
    return Promise.reject(error);
  }
);

// ✅ CORRECT: Don't auto-redirect, let components handle it
axios.defaults.withCredentials = true;  // Send cookies with requests
// No auto-redirect interceptor
```

#### Solution B: Domain Matching
**Frontend: `.env`**
```bash
# ❌ WRONG: Different domains
REACT_APP_BACKEND_URL=http://127.0.0.1:8000  # Backend at 127.0.0.1
# But frontend accessed at http://localhost:3000 - NO COOKIE MATCH!

# ✅ CORRECT: Same domain
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

#### Solution C: Cookie Settings
**Backend: `server.py`**
```python
# ❌ WRONG: SameSite=none with Secure=False doesn't work
response.set_cookie(
    key="session_token",
    value=token,
    samesite="none",
    secure=False,  # INVALID: none requires secure=True
)

# ✅ CORRECT: Use samesite=lax for localhost
response.set_cookie(
    key="session_token",
    value=token,
    httponly=True,
    samesite="lax",
    secure=False,
    max_age=7 * 24 * 60 * 60,
    path="/",
)
```

#### Solution D: Auth Loop Fix
**Frontend: `src/context/AuthContext.jsx`**
```javascript
// ❌ WRONG: Dependency on refreshUser causes re-runs
useEffect(() => {
  refreshUser();
}, [refreshUser]);  // This triggers every time refreshUser changes!

// ✅ CORRECT: Only run on mount
useEffect(() => {
  refreshUser();
}, []);  // Empty deps = run once on mount
```

### How to Debug
1. **Check cookies** - DevTools → Application → Cookies
2. **Test with curl** - See if cookies work from terminal
3. **Check domain** - Frontend and backend must use same domain
4. **Verify SameSite** - For localhost, use `lax`, not `none`

---

## 5. Infinite Authorization Loop

### Problem
```
React component constantly calling /api/auth/me
Multiple 401 errors flooding the console
```

### Root Cause
- `refreshUser` callback in AuthContext dependency array
- `useEffect([refreshUser])` runs every time the callback changes
- Causes infinite loop of auth checks

### Solution
```javascript
// ❌ WRONG: Loop
useEffect(() => {
  refreshUser();
}, [refreshUser]);

// ✅ CORRECT: Run once
useEffect(() => {
  refreshUser();
}, []);
```

### How to Debug
- Check React DevTools → Profiler tab
- Look for repeated component renders
- Count how many times `useEffect` runs
- If running infinitely, check dependencies

---

## 6. Cookie Domain Mismatch

### Problem
```
Login succeeds but subsequent requests get 401
Cookie is created but not sent in next request
```

### Root Cause
Browser cookies are domain-specific:
- Frontend at `localhost:3000` 
- Backend at `127.0.0.1:8000`
- Browser treats as different domains → won't send cookie

### Solution
Use the **same domain** everywhere:

**Option A: Use localhost everywhere**
```bash
# Frontend .env
REACT_APP_BACKEND_URL=http://localhost:8000

# Backend: Listen on localhost
python3 -m uvicorn server:app --host localhost --port 8000
```

**Option B: Use 127.0.0.1 everywhere**
```bash
# Frontend .env
REACT_APP_BACKEND_URL=http://127.0.0.1:8000

# Backend: Listen on 127.0.0.1
python3 -m uvicorn server:app --host 127.0.0.1 --port 8000
```

### How to Debug
```bash
# Test cookie with curl
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jordan@example.com","password":"password123"}'

# Try authenticated request
curl -b cookies.txt http://localhost:8000/api/alerts

# If it works with curl but not browser:
# - Check frontend domain matches backend
# - Check DevTools → Application → Cookies
```

---

## 7. WebSocket 403 Forbidden

### Problem
```
INFO:     127.0.0.1:55094 - "WebSocket /socket.io/?EIO=4&transport=websocket" 403
```

### Root Cause
- CORS not allowing the WebSocket origin
- Missing frontend domain in `cors_allowed_origins`

### Solution
```python
# ❌ WRONG: WebSocket CORS not configured
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# ✅ CORRECT: Explicit origins
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000"]
)
```

---

## 8. Environment Variables Not Loaded

### Problem
```
Backend tries to connect with undefined DATABASE_URL
```

### Root Cause
- `.env` file not being read
- Working directory is wrong
- Environment variables not exported

### Solution
```bash
# ❌ WRONG: Don't hardcode
DATABASE_URL="postgresql://user:pass@localhost/db"

# ✅ CORRECT: Use env file
# 1. Create .env in backend/ directory
# 2. Run from backend directory
cd backend
python3 -m uvicorn server:app --reload --port 8000

# Or use python-dotenv
from dotenv import load_dotenv
load_dotenv()
```

### How to Debug
```bash
# Check if .env is being read
python3 -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('DATABASE_URL'))"

# Check working directory
pwd

# Verify .env exists
ls -la backend/.env
```

---

## 9. Frontend Pages Show 404/Failed

### Problem
```
Failed to load alerts
Failed to load transactions
Failed to load rules
```

### Root Cause
- Backend not running
- Session not authenticated (401 responses)
- Incorrect API URLs in pages

### Solution
```javascript
// Each page must:
// 1. Use the BACKEND_URL from env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// 2. Include credentials
axios.get(`${BACKEND_URL}/api/alerts`, { withCredentials: true })

// 3. Handle errors gracefully
.catch(error => {
  console.error('Failed to load alerts:', error);
  toast.error('Failed to load alerts');
})
```

### How to Debug
1. Open DevTools → Network tab
2. Look for failed requests
3. Check status code (404, 401, 500)
4. Look at the response body for error message
5. Verify `BACKEND_URL` is correct in console: `console.log(process.env.REACT_APP_BACKEND_URL)`

---

## 10. React Infinite Loops

### Problem
```
Component renders hundreds of times
Browser slows down or freezes
```

### Root Cause
Usually in `useEffect` dependencies:
- Callback in dependencies that changes
- Object/array created inline in dependencies
- Forgot empty dependency array `[]`

### Common Mistakes
```javascript
// ❌ WRONG #1: Callback in dependencies
const refreshUser = useCallback(async () => { ... }, []);
useEffect(() => {
  refreshUser();
}, [refreshUser]);  // Changes every render!

// ✅ CORRECT #1: Use empty deps
useEffect(() => {
  refreshUser();
}, []);

// ❌ WRONG #2: Object inline
useEffect(() => {
  // fetchData(obj);
}, [{ id: 1 }]);  // New object every render!

// ✅ CORRECT #2: Extract outside or useMemo
const obj = useMemo(() => ({ id: 1 }), []);
useEffect(() => {
  // fetchData(obj);
}, [obj]);

// ❌ WRONG #3: No dependency array
useEffect(() => {
  refreshUser();
});  // Runs every render!

// ✅ CORRECT #3: Empty array for once
useEffect(() => {
  refreshUser();
}, []);
```

### How to Debug
1. Open React DevTools Profiler
2. Record and check render counts
3. Look for repeated component renders
4. Check `useEffect` dependencies in the code
5. Use `console.log()` in `useEffect` to see how many times it runs

---

## 11. Backend Requirements Not Installed

### Problem
```
ModuleNotFoundError: No module named 'fastapi'
ModuleNotFoundError: No module named 'uvicorn'
```

### Root Cause
- `requirements.txt` dependencies not installed
- Wrong Python environment

### Solution
```bash
# Install dependencies
cd backend
python3 -m pip install -r requirements.txt

# Or use venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Then run
python3 -m uvicorn server:app --reload --port 8000
```

### How to Debug
```bash
# Check what's installed
python3 -m pip list

# Check requirements
cat backend/requirements.txt

# Install specific package
python3 -m pip install fastapi uvicorn python-socketio
```

---

## 12. Port Already in Use

### Problem
```
Address already in use
Port 8000 already bound
```

### Root Cause
- Backend still running from previous session
- Another process using the port

### Solution
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or change port
python3 -m uvicorn server:app --reload --port 8001
```

---

## Debugging Checklist

When you encounter an issue, follow this checklist:

- [ ] **Read the error message carefully** - It usually tells you exactly what's wrong
- [ ] **Check terminal output** - Both frontend and backend logs
- [ ] **Open DevTools** - Browser console and Network tab
- [ ] **Test with curl** - Verify backend works independently
- [ ] **Check .env files** - Are variables set correctly?
- [ ] **Verify domains match** - Frontend and backend same hostname
- [ ] **Check process status** - Is backend running? `ps aux | grep uvicorn`
- [ ] **Look at dependencies** - useEffect, callback dependencies
- [ ] **Test one component** - Isolate the problem
- [ ] **Search for similar errors** - Google the error message

---

## Quick Test Commands

```bash
# Test backend is running
curl http://localhost:8000/

# Test login endpoint
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jordan@example.com","password":"password123"}'

# Test with cookies
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jordan@example.com","password":"password123"}'

curl -b cookies.txt http://localhost:8000/api/alerts

# Check what's running
ps aux | grep -E 'uvicorn|npm|node'

# Kill all services
npm run stop
```

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ERR_CONNECTION_REFUSED` | Backend not running | Start backend: `python3 -m uvicorn server:app --reload --port 8000` |
| `404 Not Found` | Wrong endpoint path | Check backend routes match frontend calls |
| `401 Unauthorized` | No auth cookie sent | Check domain matching and `withCredentials: true` |
| `CORS policy blocked` | Origins mismatch | Add frontend origin to CORS in backend |
| `python: command not found` | Using `python` instead of `python3` | Use `python3 -m uvicorn ...` |
| `ModuleNotFoundError` | Dependency not installed | Run `python3 -m pip install -r requirements.txt` |
| `Address already in use` | Port bound by another process | Kill process or use different port |
| `Infinite loop/freeze` | Bad useEffect deps | Check dependencies are correct |

---

**Last Updated:** November 14, 2025
