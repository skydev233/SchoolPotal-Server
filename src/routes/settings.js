import express from 'express';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const settings = await db.all('SELECT k, v FROM settings');
    const settingsObj = {};
    for (const s of settings) {
      settingsObj[s.k] = s.v;
    }
    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/update', adminMiddleware, async (req, res) => {
  try {
    const updates = req.body;

    for (const [k, v] of Object.entries(updates)) {
      await db.run('INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)', [k, v]);
    }

    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;