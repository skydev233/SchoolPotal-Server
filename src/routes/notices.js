import express from 'express';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const notices = await db.all('SELECT * FROM notices ORDER BY id DESC LIMIT ?', [limit]);
    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { title, tag } = req.body;

    if (!title || !tag) {
      return res.status(400).json({ error: 'Title and tag required' });
    }

    const result = await db.run(
      'INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)',
      [title, tag, new Date().toISOString()]
    );

    res.status(201).json({ message: 'Notice created', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;