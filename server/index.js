import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import playersRouter from './routes/players.js';
import teamsRouter from './routes/teams.js';
import historyRouter from './routes/history.js';
import rulesRouter from './routes/rules.js';
import matchesRouter from './routes/matches.js';
import authRouter from './routes/auth.js';
import geminiRouter from './routes/gemini.js';
import settingsRouter from './routes/settings.js';
import Rule from './models/Rule.js';
import Team from './models/Team.js';
import { DEFAULT_RULES } from './data/defaultRules.js';
import { DEFAULT_TEAMS } from './data/defaultTeams.js';
import { serveSwaggerUi, setupSwaggerUi, openApiSpec } from './swagger.js';
import { verifyApiKey } from './middleware/authApiKey.js';

import http from 'http';
import { setupSocket } from './socket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Setup Socket.io real-time streaming engine
setupSocket(httpServer);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Protect mutating API routes with API key verification
app.use('/api', verifyApiKey);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/players', playersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/history', historyRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/settings', settingsRouter);

// ── Interactive API Documentation (OpenAPI 3.0 / Swagger UI & Redoc) ─────────
app.use('/api/docs', serveSwaggerUi, setupSwaggerUi);
app.get('/docs', (req, res) => res.redirect('/api/docs'));
app.get('/api/openapi.json', (req, res) => res.json(openApiSpec));

// Redoc 3-Column API Documentation View (FastAPI style)
app.get(['/redoc', '/api/redoc'], (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>NEPL Box Cricket League API — Redoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; background: #070b14; }
    </style>
  </head>
  <body>
    <redoc spec-url='/api/openapi.json' theme='{
      "colors": {
        "primary": { "main": "#06b6d4" },
        "success": { "main": "#10b981" },
        "warning": { "main": "#f59e0b" },
        "error": { "main": "#f43f5e" }
      },
      "typography": {
        "fontFamily": "Inter, sans-serif",
        "headings": { "fontFamily": "Inter, sans-serif" },
        "code": { "fontFamily": "Fira Code, monospace" }
      },
      "sidebar": { "backgroundColor": "#0b1120", "textColor": "#cbd5e1" },
      "rightPanel": { "backgroundColor": "#070b14" }
    }'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>`);
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    db: statusMap[dbStatus] || 'unknown',
    dbState: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── Serve Static Production Build (Render / Production) ──────────────────────
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA Fallback for client-side routing (compatible with Express 4/5 & path-to-regexp 8+)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/docs') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start Express + Socket.io Server (Render compatibility) ──────────────────
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use by another process.`);
    console.error(`👉  To free port ${PORT}, run: kill -9 $(lsof -t -i :${PORT}) or npx kill-port ${PORT}\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀  NEPL Server + Live Socket Stream running on port ${PORT}`);
  console.log(`📖  Interactive API Docs available at http://localhost:${PORT}/api/docs`);
  console.log(`🔑  API Key protection active for mutating routes (x-api-key required)\n`);
});

// ── MongoDB Connection & Auto-Seeding ─────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI.includes('cluster0.example.mongodb.net')) {
  console.error('\n╔════════════════════════════════════════════════════════╗');
  console.error('║  ⚠️  MongoDB URI not configured!                        ║');
  console.error('║  Paste your MONGODB_URI in environment variables.       ║');
  console.error('╚════════════════════════════════════════════════════════╝\n');
} else {
  mongoose.connect(MONGODB_URI, {
    dbName: 'nepl_cricket',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  })
  .then(async () => {
    console.log('✅  Connected to MongoDB Atlas (nepl_cricket database)');

    // Auto-seed rules collection in MongoDB if empty
    try {
      const existingRulesCount = await Rule.countDocuments();
      if (existingRulesCount === 0) {
        await Rule.insertMany(DEFAULT_RULES);
        console.log(`📌  Seeded ${DEFAULT_RULES.length} tournament rules into MongoDB Atlas (rules collection)`);
      } else {
        console.log(`📌  MongoDB Atlas contains ${existingRulesCount} tournament rules`);
      }
    } catch (err) {
      console.warn('⚠️  Rule auto-seed warning:', err.message);
    }

    // Auto-seed teams collection in MongoDB if empty
    try {
      const existingTeamsCount = await Team.countDocuments();
      if (existingTeamsCount === 0) {
        await Team.insertMany(DEFAULT_TEAMS);
        console.log(`📌  Seeded ${DEFAULT_TEAMS.length} franchise teams into MongoDB Atlas (teams collection)\n`);
      } else {
        console.log(`📌  MongoDB Atlas contains ${existingTeamsCount} franchise teams\n`);
      }
    } catch (err) {
      console.warn('⚠️  Team auto-seed warning:', err.message);
    }
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
  });
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅  MongoDB reconnected');
});
