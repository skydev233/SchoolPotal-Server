import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';

export default async function noticesRoutes(fastify) {
  fastify.get('/', async (req, res) => {
    try {
      const limit = parseInt(req.query?.limit || '10', 10);
      const notices = await db.all('SELECT * FROM notices ORDER BY id DESC LIMIT ?', [limit]);
      return notices;
    } catch (error) {
      console.error('Get notices error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { title, tag } = req.body || {};

      if (!title || !tag) {
        return res.status(400).send({ error: 'Title and tag required' });
      }

      const result = await db.run(
        'INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)',
        [title, tag, new Date().toISOString()]
      );

      return res.status(201).send({ message: 'Notice created', id: result.lastInsertRowid });
    } catch (error) {
      console.error('Create notice error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });
}
