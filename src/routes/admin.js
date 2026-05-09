import express from 'express';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { hashPassword, validatePassword } from '../utils/auth.js';

const router = express.Router();

router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, email, role, created_at FROM users ORDER BY id ASC');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/create', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const hashedPassword = hashPassword(password);
    const result = await db.run(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role || 'user', new Date().toISOString()]
    );

    res.status(201).json({ message: 'User created', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/update', async (req, res) => {
  try {
    const { id, password, role } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      const hashedPassword = hashPassword(password);
      await db.run('UPDATE users SET password = ?, role = ? WHERE id = ?', [hashedPassword, role, id]);
    } else {
      await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }

    res.json({ message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/delete', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM users WHERE id IN (${placeholders})`, ids);

    res.json({ message: 'Users deleted' });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;