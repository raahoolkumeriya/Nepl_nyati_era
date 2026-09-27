# NEPL — Nyati Era Premier League · Box Cricket Auction Platform

A full-stack React + Node.js application for live cricket player auctions, team squad management, standings, and rules for the Nyati Era Dhanori community.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5 + Socket.io (Real-Time Live Streaming) |
| Database | MongoDB Atlas (via Mongoose) |
| Auth | Role-based (Session) |

## 📐 System Design & Architecture

Comprehensive design documentation, C4 models, ERDs, and sequence flows are available in the [`design/`](file:///Users/raahool/applications/github/Nepl_nyati_era/design/README.md) directory:
- 📖 [**Design Hub & README**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/README.md)
- 🏛️ [**High-Level Design (HLD)**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/HLD.md)
- ⚙️ [**Low-Level Design (LLD)**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/LLD.md)
- 📊 [**Architecture Diagrams (Mermaid Models)**](file:///Users/raahool/applications/github/Nepl_nyati_era/design/ARCHITECTURE.md)

---

## Architecture & Real-Time Live Streaming

```
Browser / Mobile / TV (React 19)
    │                     ▲
    │  HTTP /api/*        │ WebSocket (Socket.io)
    ▼                     │ Live Bid Broadcasts
Express + Socket.io Server (Node.js — server/index.js & server/socket.js)
    │
    ▼  Mongoose queries
MongoDB Atlas (nepl_cricket database & auctionstates collection)
```

> **Real-Time Live Auction Synchronization:**  
> When any device (Auctioneer laptop, Team Owner smartphone, or Super Admin) bids or advances a player, the bid is instantly broadcasted over Socket.io WebSockets to every connected screen with zero reload required.

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

## Auth & Role Configuration

Role credentials are securely managed through environment variables in your private `.env` file:

| Role | Default Email | Password Environment Variable | Permissions |
|---|---|---|---|
| 👑 Dev Master | `developer@nepl.in` | `VITE_SUPREMEMASTER_PASS` | Full System Reset & Dev Management |
| ⚡ Super Admin | `admin@nepl.in` | `VITE_SUPERUSER_PASS` | Live Bidding, Sell/Unsell, Team & User Management, Projector |
| 🔨 Auctioneer | `auction@nepl.in` | `VITE_AUCTIONEER_PASS` | Live Bidding, View Teams & Players, Projector |
| 🏏 Player | `player@nepl.in` | `VITE_PLAYER_PASS` | View Teams, Players, Rules & Schedule |

> **Security Note:** Passwords are never hardcoded in source code files. Configure your secret passwords in your private `.env` file (which is git-ignored). In local/demo environments, clicking any profile tile on the login page autofills credentials directly from your `.env` configuration.

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
