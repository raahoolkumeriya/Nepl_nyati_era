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
import Rule from './models/Rule.js';
import { DEFAULT_RULES } from './data/defaultRules.js';
import { serveSwaggerUi, setupSwaggerUi, openApiSpec } from './swagger.js';
import { verifyApiKey } from './middleware/authApiKey.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Protect mutating API routes with API key verification
app.use('/api', verifyApiKey);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/players', playersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/history', historyRouter);
app.use('/api/rules', rulesRouter);

// ── Interactive API Documentation (OpenAPI 3.0 / Swagger UI) ────────────────
app.use('/api/docs', serveSwaggerUi, setupSwaggerUi);
app.get('/docs', (req, res) => res.redirect('/api/docs'));
app.get('/api/openapi.json', (req, res) => res.json(openApiSpec));

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    db: dbStatus === 1 ? 'connected' : dbStatus === 2 ? 'connecting' : 'disconnected',
    dbState: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── Serve Static Production Build (Render / Production) ──────────────────────
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA Fallback for client-side routing (compatible with Express 4/5 & path-to-regexp 8+)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/docs')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start Express Server Immediately (Render compatibility) ──────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  NEPL Server running on port ${PORT}`);
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
  })
  .then(async () => {
    console.log('✅  Connected to MongoDB Atlas (nepl_cricket database)');

    // Auto-seed rules collection in MongoDB if empty
    try {
      const existingRulesCount = await Rule.countDocuments();
      if (existingRulesCount === 0) {
        await Rule.insertMany(DEFAULT_RULES);
        console.log(`📌  Seeded ${DEFAULT_RULES.length} tournament rules into MongoDB Atlas (rules collection)\n`);
      } else {
        console.log(`📌  MongoDB Atlas contains ${existingRulesCount} tournament rules\n`);
      }
    } catch (err) {
      console.warn('⚠️  Rule auto-seed warning:', err.message);
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
