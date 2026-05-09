import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { hashPassword, validatePassword } from '../utils/auth.js';

export default async function adminRoutes(fastify) {
  fastify.get('/users', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, email, role, created_at FROM users ORDER BY id ASC');
      return users;
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/create', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { username, email, password, role } = req.body || {};

      if (!username || !email || !password) {
        return res.status(400).send({ error: 'Username, email and password required' });
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).send({ error: passwordError });
      }

      const hashedPassword = hashPassword(password);
      const result = await db.run(
        'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, role || 'user', new Date().toISOString()]
      );

      return res.status(201).send({ message: 'User created', id: result.lastInsertRowid });
    } catch (error) {
      console.error('Create user error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/update', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { id, password, role } = req.body || {};

      if (!id) {
        return res.status(400).send({ error: 'User ID required' });
      }

      if (password) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          return res.status(400).send({ error: passwordError });
        }
        const hashedPassword = hashPassword(password);
        await db.run('UPDATE users SET password = ?, role = ? WHERE id = ?', [hashedPassword, role, id]);
      } else {
        await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
      }

      return { message: 'User updated' };
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/delete', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { id } = req.query || {};

      if (!id) {
        return res.status(400).send({ error: 'User ID required' });
      }

      await db.run('DELETE FROM users WHERE id = ?', [id]);
      return { message: 'User deleted' };
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/users/batch-delete', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { ids } = req.body || {};

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).send({ error: 'IDs required' });
      }

      const placeholders = ids.map(() => '?').join(',');
      await db.run(`DELETE FROM users WHERE id IN (${placeholders})`, ids);

      return { message: 'Users deleted' };
    } catch (error) {
      console.error('Batch delete error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });
}
