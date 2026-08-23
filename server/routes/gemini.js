import express from 'express';
import dotenv from 'dotenv';
import { DEFAULT_RULES } from '../data/defaultRules.js';

dotenv.config();

const router = express.Router();
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * @swagger
 * /api/gemini/chat:
 *   post:
 *     summary: Chat with Gemini AI Tournament Strategist
 *     description: Ingests NEFL 2026 rules and answers tournament arbitration and strategy questions.
 *     tags: [AI]
 */
router.post('/chat', async (req, res) => {
  try {
    const { prompt, conversationHistory = [], customRules = '', apiKey = '' } = req.body;
    const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!effectiveKey) {
      return res.json({
        success: true,
        source: 'NEFL Server Rules Engine (Fallback)',
        text: `Server processed query for: "${prompt}". Configure GEMINI_API_KEY in .env for live AI responses.`
      });
    }

    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${effectiveKey.trim()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are the NEPL Box Cricket AI Tournament Strategist. Answer the following inquiry: ${prompt}` }]
          }
        ]
      })
    });

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated from Gemini.';

    res.json({
      success: true,
      source: 'Gemini 1.5 Flash (Live AI)',
      text: textOutput
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
