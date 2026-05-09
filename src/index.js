import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import liveRoutes from './routes/live.js';
import noticesRoutes from './routes/notices.js';
import settingsRoutes from './routes/settings.js';

const app = Fastify({ logger: false });
const PORT = process.env.PORT || 8080;

await app.register(cors, { origin: true });

app.get('/api/health', async () => {
  return { status: 'ok', time: new Date().toISOString() };
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(adminRoutes, { prefix: '/api/admin' });
await app.register(liveRoutes, { prefix: '/api/live' });
await app.register(noticesRoutes, { prefix: '/api/notices' });
await app.register(settingsRoutes, { prefix: '/api/settings' });

app.setErrorHandler((err, req, res) => {
  console.error('Error:', err);
  res.status(500).send({ error: 'Internal server error' });
});

await initDatabase();

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${PORT}`);
} catch (error) {
  console.error('Server start failed:', error);
  process.exit(1);
}
