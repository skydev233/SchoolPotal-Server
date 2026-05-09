import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { generateStreamKey } from '../utils/auth.js';

const RTMP_HOST = 'localhost';

export default async function liveRoutes(fastify) {
  fastify.get('/channels', async (req, res) => {
    try {
      const channels = await db.all("SELECT id, name, COALESCE(description, '') as description, created_at FROM live_channels ORDER BY id ASC");
      return channels;
    } catch (error) {
      console.error('Get channels error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/channels/create', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { name, description } = req.body || {};

      if (!name) {
        return res.status(400).send({ error: 'Channel name required' });
      }

      const result = await db.run(
        'INSERT INTO live_channels (name, description, created_at) VALUES (?, ?, ?)',
        [name, description || '', new Date().toISOString()]
      );

      return res.status(201).send({ message: 'Channel created', id: result.lastInsertRowid });
    } catch (error) {
      console.error('Create channel error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/channels/delete', { preHandler: adminMiddleware }, async (req, res) => {
    try {
      const { id } = req.query || {};

      if (!id) {
        return res.status(400).send({ error: 'Channel ID required' });
      }

      await db.run('DELETE FROM live_channels WHERE id = ?', [id]);
      return { message: 'Channel deleted' };
    } catch (error) {
      console.error('Delete channel error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/schedule', async (req, res) => {
    try {
      const schedules = await db.all(`
        SELECT id, channel_id as channelId, title, start_time as startTime, COALESCE(end_time, '') as endTime,
               user_id as userId, user_email as userEmail, status, created_at as createdAt
        FROM live_schedules ORDER BY start_time ASC
      `);
      return schedules;
    } catch (error) {
      console.error('Get schedule error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/book', async (req, res) => {
    try {
      const { channelId, title, startTime, userId, userEmail } = req.body || {};

      if (!channelId || !title || !startTime) {
        return res.status(400).send({ error: 'Channel ID, title and start time required' });
      }

      const conflict = await db.get(
        `SELECT COUNT(*) as count FROM live_schedules
         WHERE channel_id = ? AND status != 'ended'
         AND start_time <= ?
         AND (start_time::timestamptz + INTERVAL '2 hour') > ?::timestamptz`,
        [channelId, startTime, startTime]
      );

      if (conflict.count > 0) {
        return res.status(409).send({ error: 'Time slot already booked' });
      }

      const streamKey = generateStreamKey();
      const result = await db.run(
        `INSERT INTO live_schedules (channel_id, title, start_time, stream_key, user_id, user_email, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
        [channelId, title, startTime, streamKey, userId || 1, userEmail || '', new Date().toISOString()]
      );

      return res.status(201).send({
        id: result.lastInsertRowid,
        channelId: parseInt(channelId, 10),
        title,
        startTime,
        streamKey,
        status: 'scheduled'
      });
    } catch (error) {
      console.error('Book live error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/stream-key', async (req, res) => {
    try {
      const { id } = req.query || {};

      if (!id) {
        return res.status(400).send({ error: 'Schedule ID required' });
      }

      const schedule = await db.get('SELECT * FROM live_schedules WHERE id = ?', [id]);

      if (!schedule) {
        return res.status(404).send({ error: 'Schedule not found' });
      }

      return {
        streamKey: schedule.stream_key,
        serverUrl: `rtmp://${RTMP_HOST}/live`
      };
    } catch (error) {
      console.error('Get stream key error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/status', async (req, res) => {
    try {
      const { channelId } = req.query || {};

      let schedules = [];
      if (channelId) {
        schedules = await db.all(
          `SELECT id, channel_id as channelId, title, start_time as startTime, status
           FROM live_schedules WHERE channel_id = ? ORDER BY start_time ASC`,
          [channelId]
        );
      }

      const status = schedules.some((s) => s.status === 'live') ? 'live' : 'idle';
      return { status, schedules };
    } catch (error) {
      console.error('Get status error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });
}
