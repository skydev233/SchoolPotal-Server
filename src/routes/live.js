import express from 'express';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { generateStreamKey } from '../utils/auth.js';

const router = express.Router();

router.get('/channels', async (req, res) => {
  try {
    const channels = await db.all('SELECT id, name, COALESCE(description, \'\') as description, created_at FROM live_channels ORDER BY id ASC');
    res.json(channels);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/channels/create', adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Channel name required' });
    }

    const result = await db.run(
      'INSERT INTO live_channels (name, description, created_at) VALUES (?, ?, ?)',
      [name, description || '', new Date().toISOString()]
    );

    res.status(201).json({ message: 'Channel created', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/channels/delete', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Channel ID required' });
    }

    await db.run('DELETE FROM live_channels WHERE id = ?', [id]);
    res.json({ message: 'Channel deleted' });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/schedule', async (req, res) => {
  try {
    const schedules = await db.all(`
      SELECT id, channel_id as channelId, title, start_time as startTime, COALESCE(end_time, '') as endTime,
             user_id as userId, user_email as userEmail, status, created_at as createdAt
      FROM live_schedules ORDER BY start_time ASC
    `);
    res.json(schedules);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/book', async (req, res) => {
  try {
    const { channelId, title, startTime, userId, userEmail } = req.body;

    if (!channelId || !title || !startTime) {
      return res.status(400).json({ error: 'Channel ID, title and start time required' });
    }

    const conflict = await db.get(`
      SELECT COUNT(*) as count FROM live_schedules
      WHERE channel_id = ? AND status != 'ended'
      AND start_time <= ?
      AND DATE_ADD(start_time, INTERVAL 2 HOUR) > ?
    `, [channelId, startTime, startTime]);

    if (conflict.count > 0) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }

    const streamKey = generateStreamKey();
    const result = await db.run(`
      INSERT INTO live_schedules (channel_id, title, start_time, stream_key, user_id, user_email, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `, [channelId, title, startTime, streamKey, userId || 1, userEmail || '', new Date().toISOString()]);

    res.status(201).json({
      id: result.lastInsertRowid,
      channelId: parseInt(channelId),
      title,
      startTime,
      streamKey,
      status: 'scheduled'
    });
  } catch (error) {
    console.error('Book live error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stream-key', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Schedule ID required' });
    }

    const schedule = await db.get('SELECT * FROM live_schedules WHERE id = ?', [id]);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const rtmpHost = process.env.RTMP_HOST || 'localhost';

    res.json({
      streamKey: schedule.stream_key,
      serverUrl: `rtmp://${rtmpHost}/live`
    });
  } catch (error) {
    console.error('Get stream key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const { channelId } = req.query;

    let schedules = [];
    if (channelId) {
      schedules = await db.all(`
        SELECT id, channel_id as channelId, title, start_time as startTime, status
        FROM live_schedules WHERE channel_id = ? ORDER BY start_time ASC
      `, [channelId]);
    }

    const status = schedules.some(s => s.status === 'live') ? 'live' : 'idle';
    res.json({ status, schedules });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;