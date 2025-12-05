# Baymax IT Care

> "Hello. I am Baymax, your personal IT healthcare companion."

A Big Hero 6 inspired rating app for your friendly neighborhood one-person IT department. Let your coworkers rate their IT care experience and help Baymax improve his service protocols.

## Features

- **Patient Satisfaction Survey**: 5-star rating system with Baymax-style satisfaction labels
- **9 Care Categories**: Emergency Response, Computer Diagnostics, Printer Rehabilitation, and more
- **Patient Feedback**: Optional comments to describe your IT care experience
- **Care Statistics**: Track patients served, satisfaction levels, and treatment types
- **Healthcare Companion Levels**: Earn titles from "Healthcare Companion in Training" to "Superior Healthcare Companion"
- **Patient Feedback Log**: See what other patients are saying

## Tech Stack

- **Backend**: Node.js + Express + SQLite (via better-sqlite3)
- **Frontend**: React + Vite
- **Database**: SQLite (auto-created on first run)
- **Theme**: Baymax-inspired (white, red accents, rounded corners)

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

The care server will run on `http://localhost:3001`

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The patient portal will run on `http://localhost:5173`

### 3. Open the App

Navigate to `http://localhost:5173` and start rating your IT care!

## Care Categories

| Category | Description |
|----------|-------------|
| Emergency Response | When systems were critical and immediate care was required |
| Computer Diagnostics | Scanning for technical ailments and prescribing solutions |
| Password Recovery | Restoring access to forgotten credentials |
| Printer Rehabilitation | Physical therapy for paper-handling devices |
| Email Treatment | Treating communication disorders and inbox ailments |
| Network Recovery | Restoring connectivity and treating wireless conditions |
| Device Setup | New patient onboarding and device configuration |
| Major Procedure | Complex IT operations requiring extended care |
| General Checkup | Routine maintenance and preventive care |

## Healthcare Companion Levels

Your care level is determined by average patient satisfaction:

| Average Rating | Title |
|---------------|-------|
| 4.5+ stars | Superior Healthcare Companion |
| 4.0+ stars | Advanced Care Provider |
| 3.5+ stars | Certified IT Healthcare Companion |
| 3.0+ stars | IT Care Provider |
| Below 3.0 | Healthcare Companion in Training |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if Baymax is operational |
| GET | `/api/categories` | List all care categories |
| POST | `/api/ratings` | Submit patient feedback |
| GET | `/api/ratings` | Get patient feedback log |
| GET | `/api/stats` | Get care statistics |

## Baymax Responses

Baymax provides personalized responses based on your satisfaction level:

- **5 stars**: "Your satisfaction levels are optimal. Fist bump? Ba-la-la-la-la. 👊"
- **4 stars**: "I am pleased you are mostly satisfied with your care. Ba-la-la-la-la."
- **3 stars**: "Your satisfaction level is moderate. I will strive to exceed expectations next time."
- **2 stars**: "I sense there is room for improvement. Your feedback will help me provide better care."
- **1 star**: "I detect signs of dissatisfaction. I will add this to my care improvement protocols."

---

*"I cannot deactivate until you say you are satisfied with your care."*

Ba-la-la-la-la 👊
