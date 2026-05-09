import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import liveRoutes from './routes/live.js';
import noticesRoutes from './routes/notices.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

await initDatabase();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});