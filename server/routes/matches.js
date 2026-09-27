import express from 'express';
import Match from '../models/Match.js';

const router = express.Router();

// GET all matches
router.get('/', async (req, res) => {
  try {
    const matches = await Match.find().sort({ matchNumber: 1, createdAt: 1 }).lean();
    res.json(matches.map(({ _id, __v, ...m }) => m));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT bulk replace / sync all matches
router.put('/', async (req, res) => {
  try {
    const matches = req.body;
    await Match.deleteMany({});
    if (Array.isArray(matches) && matches.length > 0) {
      await Match.insertMany(matches, { ordered: false });
    }
    res.json({ success: true, count: matches.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST add single match
router.post('/', async (req, res) => {
  try {
    const matchData = req.body;
    if (!matchData.id) {
      matchData.id = `m-${Date.now()}`;
    }
    const created = await Match.create(matchData);
    const { _id, __v, ...m } = created.toObject();
    res.status(201).json(m);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update single match
router.put('/:id', async (req, res) => {
  try {
    const match = await Match.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { returnDocument: 'after', upsert: true, lean: true }
    );
    const { _id, __v, ...m } = match;
    res.json(m);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE single match
router.delete('/:id', async (req, res) => {
  try {
    await Match.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
