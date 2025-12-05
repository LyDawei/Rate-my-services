# Rate My IT Services

A whimsical rating app for the legendary one-person IT department. Let your coworkers rate your IT heroism (or roast you constructively).

## Features

- 5-star rating system with fun hover messages
- 9 whimsical task categories (Crisis Averted, Printer Taming, Password Resurrection, etc.)
- Optional comments for feedback (or roasting)
- Anonymous or named submissions
- Real-time stats dashboard with "IT Hero Title" based on average rating
- Wall of Fame showing recent ratings
- Fun category breakdowns and statistics

## Tech Stack

- **Backend**: Node.js + Express + SQLite (via better-sqlite3)
- **Frontend**: React + Vite
- **Database**: SQLite (auto-created on first run)

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

The API server will run on `http://localhost:3001`

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Open the App

Navigate to `http://localhost:5173` and start collecting ratings!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/categories` | List all task categories |
| POST | `/api/ratings` | Submit a new rating |
| GET | `/api/ratings` | Get all ratings (paginated) |
| GET | `/api/stats` | Get fun statistics |

## Task Categories

- Crisis Averted - When everything was on fire
- Computer Whispering - General PC therapy
- Password Resurrection - Bringing credentials back from the dead
- Printer Taming - The eternal struggle
- Email Sorcery - Making mail mysteries disappear
- Network Necromancy - Reviving dead connections
- Gadget Guidance - Device setup and mobile help
- Big Brain Project - Major IT initiatives
- Misc Magic - Everything else

## Hero Titles

Your IT Hero Title is determined by your average rating:

- 4.5+ stars: Legendary IT Wizard
- 4.0+ stars: Senior IT Sorcerer
- 3.5+ stars: IT Knight
- 3.0+ stars: IT Squire
- 2.0+ stars: IT Apprentice
- Below 2.0: IT Intern

---

Made with caffeine and questionable life choices. Remember: Have you tried turning it off and on again?
