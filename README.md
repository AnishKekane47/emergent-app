# AI-Driven Fraud Detection & Alerting System

A comprehensive fraud detection system powered by AI and configurable rule-based engines, built with FastAPI, React, and MongoDB.

## Features

### Core Capabilities
- **AI-Powered Analysis**: OpenAI GPT-4o analyzes transactions for fraud patterns and provides risk scores
- **Rule-Based Engine**: Customizable fraud detection rules for amount thresholds, velocity checks, location anomalies, merchant validation, and time patterns
- **Real-Time Alerts**: Instant notifications via WebSocket and email (mock mode by default)
- **Combined Scoring**: Weighted combination of AI score (60%) and rule score (40%)
- **Alert Management**: Track, investigate, and resolve fraud alerts with detailed audit trails

### Tech Stack
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React 19 with Tailwind CSS and Shadcn UI
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM key
- **Real-time**: Socket.IO for WebSocket communication
- **Authentication**: Emergent Auth (Google OAuth)
- **Email**: SendGrid (mock mode - configurable)

## Quick Start

### Access the Application
Visit: https://fraud-radar.preview.emergentagent.com

### Test the System
1. **Login**: Click "Sign in with Google"
2. **Submit Transaction**: Go to Transactions page, submit a test transaction >$5000
3. **View Alert**: Check Alerts page for generated fraud alert
4. **Manage Rules**: Configure detection rules in Rules page

## API Endpoints

- `POST /api/auth/session` - Create session
- `GET /api/auth/me` - Get current user
- `POST /api/transactions` - Submit transaction (triggers fraud analysis)
- `GET /api/alerts` - Get fraud alerts
- `PATCH /api/alerts/:id` - Update alert status
- `GET /api/rules` - Get detection rules
- `POST /api/rules` - Create new rule

## Environment Variables

Backend (`/app/backend/.env`):
```
EMERGENT_LLM_KEY=sk-emergent-7Bd06590969036f4bC
SENDGRID_API_KEY=your_sendgrid_api_key_here  # Mock mode active
```

## Service Management

```bash
# Status
sudo supervisorctl status

# Restart
sudo supervisorctl restart backend frontend

# Logs
tail -f /var/log/supervisor/backend.out.log
```

## Fraud Detection Logic

- **Rules**: Evaluate thresholds, velocity, location, time patterns
- **AI**: GPT-4o analyzes transaction for fraud indicators (0-1 score)
- **Combined**: `total_score = (rule_score * 0.4) + (ai_score * 0.6)`
- **Alert Threshold**: score >= 0.5

## Default Rules

1. High Amount Transaction (>$5000, weight 0.7)
2. Transaction Velocity (>5/hour, weight 0.6)
3. Unusual Hours (12AM-5AM, weight 0.4)

## Email Configuration

Currently in MOCK mode. To enable SendGrid:
1. Get API key from sendgrid.com
2. Update `SENDGRID_API_KEY` in backend/.env
3. Restart backend

## WebSocket Events

- `alert:new` - Real-time fraud alert notification
- Dashboard auto-updates on new alerts

## Project Structure

```
/app/
├── backend/          # FastAPI + fraud engine
├── frontend/         # React dashboard
└── README.md
```

Built with Emergent platform
