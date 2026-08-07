import express from 'express';
import Player from '../models/Player.js';

const router = express.Router();

// GET all players
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().lean();
    // Strip MongoDB _id, use our own id field
    res.json(players.map(({ _id, __v, ...p }) => p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single player
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findOne({ id: req.params.id }).lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const { _id, __v, ...p } = player;
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create player
router.post('/', async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    const { _id, __v, ...p } = player.toObject();
    res.status(201).json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update player
router.put('/:id', async (req, res) => {
  try {
    const player = await Player.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, upsert: true, lean: true }
    );
    const { _id, __v, ...p } = player;
    res.json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT bulk replace all players (used on save)
router.put('/', async (req, res) => {
  try {
    const players = req.body;
    await Player.deleteMany({});
    if (players.length > 0) {
      await Player.insertMany(players, { ordered: false });
    }
    res.json({ success: true, count: players.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE player
router.delete('/:id', async (req, res) => {
  try {
    await Player.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
