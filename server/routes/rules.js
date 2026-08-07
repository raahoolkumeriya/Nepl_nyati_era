import express from 'express';
import Rule from '../models/Rule.js';

const router = express.Router();

// GET all rules
router.get('/', async (req, res) => {
  try {
    const rules = await Rule.find().lean();
    res.json(rules.map(({ _id, __v, ...r }) => r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add single rule
router.post('/', async (req, res) => {
  try {
    const rule = new Rule(req.body);
    await rule.save();
    const { _id, __v, ...r } = rule.toObject();
    res.status(201).json(r);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT bulk replace all rules
router.put('/', async (req, res) => {
  try {
    const rules = req.body;
    await Rule.deleteMany({});
    if (rules.length > 0) {
      await Rule.insertMany(rules, { ordered: false });
    }
    res.json({ success: true, count: rules.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update single rule
router.put('/:id', async (req, res) => {
  try {
    const rule = await Rule.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, upsert: true, lean: true }
    );
    const { _id, __v, ...r } = rule;
    res.json(r);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE single rule
router.delete('/:id', async (req, res) => {
  try {
    await Rule.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
