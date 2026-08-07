import express from 'express';
import Team from '../models/Team.js';

const router = express.Router();

// GET all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().lean();
    res.json(teams.map(({ _id, __v, ...t }) => t));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT bulk replace all teams
router.put('/', async (req, res) => {
  try {
    const teams = req.body;
    await Team.deleteMany({});
    if (teams.length > 0) {
      await Team.insertMany(teams, { ordered: false });
    }
    res.json({ success: true, count: teams.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update single team
router.put('/:id', async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, upsert: true, lean: true }
    );
    const { _id, __v, ...t } = team;
    res.json(t);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE single team
router.delete('/:id', async (req, res) => {
  try {
    await Team.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
