import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';

export default async function settingsRoutes(fastify) {
  fastify.get('/', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const settings = await db.all('SELECT k, v FROM settings');
      const settingsObj = {};
      for (const s of settings) {
        settingsObj[s.k] = s.v;
      }
      return settingsObj;
    } catch (error) {
      console.error('Get settings error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/update', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const updates = req.body || {};

      for (const [k, v] of Object.entries(updates)) {
        await db.run(
          'INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v',
          [k, String(v)]
        );
      }

      return { message: 'Settings updated' };
    } catch (error) {
      console.error('Update settings error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });
}
