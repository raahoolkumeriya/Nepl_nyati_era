# NEPL — Nyati Era Premier League · Box Cricket Auction Platform

A full-stack React + Node.js application for live cricket player auctions, team squad management, standings, and rules for the Nyati Era Dhanori community.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5 |
| Database | MongoDB Atlas (via Mongoose) |
| Auth | Role-based (Session) |

---

## Architecture

```
Browser (React)
    │
    │  HTTP/JSON calls to /api/*
    ▼
Express Server (Node.js — server/index.js)  ← port 3001
    │
    │  Mongoose queries
    ▼
MongoDB Atlas (nepl_cricket database)
```

> **Why this structure?**  
> MongoDB drivers only run in server-side environments (Node.js, Python, Go, etc.), NOT in browsers.  
> The Express layer acts as a secure bridge between the browser and the database.

---

## Getting Started

### 1. Get your MongoDB Connection String

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com) with username **`codelocked`**
2. Click your cluster → **Connect** → **Connect your application**
3. Choose **Node.js / Mongoose** as the driver
4. Copy the connection string (looks like `mongodb+srv://codelocked:...@cluster0.xxxxx.mongodb.net/`)

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set:
```
MONGODB_URI=mongodb+srv://codelocked:*****@cluster0.XXXXX.mongodb.net/nepl_cricket
```
Replace `cluster0.XXXXX.mongodb.net` with your actual cluster hostname from Step 1.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Both Servers

```bash
# Starts both Vite (port 5173) + Express (port 3001) together
npm run dev:full
```

Or run them separately:
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

---

## MongoDB Atlas IP Whitelist

Go to **Atlas → Network Access** and add your IP address (or `0.0.0.0/0` for development).

---

## Auth Credentials

| Role | Email | 
|---|---|---|
| ⚡ Super Admin | `admin@nepl.in` |
| 🔨 Auctioneer | `auction@nepl.in` |
| 🏏 Player | `player@nepl.in` | 

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check server + DB status |
| GET | `/api/players` | Fetch all players |
| PUT | `/api/players` | Bulk save players |
| PUT | `/api/players/:id` | Update single player |
| GET | `/api/teams` | Fetch all teams |
| PUT | `/api/teams` | Bulk save teams |
| PUT | `/api/teams/:id` | Update single team |
| GET | `/api/history` | Fetch bid history |
| PUT | `/api/history` | Bulk save history |
| POST | `/api/history` | Add single bid entry |
