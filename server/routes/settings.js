import express from 'express';
import Settings from '../models/Settings.js';
import { getIoInstance } from '../socket.js';

const router = express.Router();

const DEFAULT_SETTINGS = {
  id: 'tournament_settings',
  tournamentName: 'Criclocked',
  subtitle: 'Box Cricket League',
  shortCode: 'CRIC',
  edition: '2026',
  logoUrl: '/cricklocked_logo.png',
  defaultBasePrice: 100,
  bidIncrementStep: 100,
  startupPurse: 10000,
};

// GET /api/settings - Fetch current tournament settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ id: 'tournament_settings' });
    if (!settings) {
      settings = await Settings.create(DEFAULT_SETTINGS);
    }
    res.json(settings);
  } catch (err) {
    console.warn('⚠️ [Settings Route] Error fetching settings:', err.message);
    res.json(DEFAULT_SETTINGS);
  }
});

// PUT /api/settings - Update tournament settings (Supreme Master operation)
router.put('/', async (req, res) => {
  try {
    const { tournamentName, subtitle, shortCode, edition, logoUrl, defaultBasePrice, bidIncrementStep, startupPurse } = req.body;

    const updated = await Settings.findOneAndUpdate(
      { id: 'tournament_settings' },
      {
        $set: {
          tournamentName: tournamentName ? String(tournamentName).trim() : 'Criclocked',
          subtitle: subtitle ? String(subtitle).trim() : 'Box Cricket League',
          shortCode: shortCode ? String(shortCode).trim() : 'CRIC',
          edition: edition ? String(edition).trim() : '2026',
          logoUrl: logoUrl ? String(logoUrl).trim() : '/cricklocked_logo.png',
          defaultBasePrice: defaultBasePrice !== undefined ? Math.max(1, Number(defaultBasePrice) || 100) : 100,
          bidIncrementStep: bidIncrementStep !== undefined ? Math.max(1, Number(bidIncrementStep) || 100) : 100,
          startupPurse: startupPurse !== undefined ? Math.max(100, Number(startupPurse) || 10000) : 10000,
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Broadcast update across all live socket connections
    const io = getIoInstance();
    if (io) {
      io.emit('settings:sync', updated);
    }

    res.json(updated);
  } catch (err) {
    console.error('❌ [Settings Route] Failed to save settings:', err);
    res.status(500).json({ error: 'Failed to update tournament settings: ' + err.message });
  }
});

export default router;
