import express from 'express';
import BidHistory from '../models/BidHistory.js';

const router = express.Router();

// GET all history (newest first)
router.get('/', async (req, res) => {
  try {
    const history = await BidHistory.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json(history.map(({ _id, __v, ...h }) => h));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT bulk replace history
router.put('/', async (req, res) => {
  try {
    const history = req.body;
    await BidHistory.deleteMany({});
    if (history.length > 0) {
      await BidHistory.insertMany(history, { ordered: false });
    }
    res.json({ success: true, count: history.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST add single history entry
router.post('/', async (req, res) => {
  try {
    const entry = new BidHistory(req.body);
    await entry.save();
    const { _id, __v, ...h } = entry.toObject();
    res.status(201).json(h);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
