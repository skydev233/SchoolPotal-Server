import pg from 'pg';

let pool = null;
const { Pool } = pg;
const DATABASE_URL = 'postgresql://neondb_owner:npg_rKXyAMs0pCh1@ep-little-recipe-ao1vdehm-pooler.c-2.ap-southeast-1.aws.neon.tech/schoolpotal?sslmode=verify-full&channel_binding=require';
const SMTP_CONFIG = {
  host: 'smtp.qq.com',
  port: '587',
  user: '1519732521@qq.com',
  pass: 'olewrrnmqbufgfcj',
  from: '1519732521@qq.com'
};
const RTMP_HOST = 'localhost';

export async function initDatabase() {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      tag TEXT NOT NULL,
      published_at TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_channels (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_schedules (
      id SERIAL PRIMARY KEY,
      channel_id INT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      stream_key TEXT NOT NULL,
      user_id INT NOT NULL,
      user_email TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES live_channels(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_stats (
      k TEXT PRIMARY KEY,
      v INT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INT DEFAULT 0
    )
  `);

  await seedData();
}

async function seedData() {
  const notices = await get('SELECT COUNT(*)::int as count FROM notices');
  if (notices.count === 0) {
    const now = new Date().toISOString();
    await run('INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)', ['欢迎使用校园门户平台', '公告', now]);
    await run('INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)', ['关于近期网络维护的通知', '信息中心', now]);
    await run('INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)', ['本周学术讲座安排', '学术', now]);
  }

  const channels = await get('SELECT COUNT(*)::int as count FROM live_channels');
  if (channels.count === 0) {
    const now = new Date().toISOString();
    await run('INSERT INTO live_channels (name, description, created_at) VALUES (?, ?, ?)', ['主频道', '学校官方直播频道', now]);
    await run('INSERT INTO live_channels (name, description, created_at) VALUES (?, ?, ?)', ['教学频道', '用于在线课程直播', now]);
  }

  const stats = await get('SELECT COUNT(*)::int as count FROM portal_stats');
  if (stats.count === 0) {
    await run('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['students', 3248]);
    await run('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['courses', 42]);
    await run('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['todos', 12]);
    await run('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['activities', 6]);
  }

  const defaultSettings = {
    'registration_enabled': 'true',
    'allowed_email_domain': '',
    'smtp_host': SMTP_CONFIG.host,
    'smtp_port': SMTP_CONFIG.port,
    'smtp_username': SMTP_CONFIG.user,
    'smtp_password': SMTP_CONFIG.pass,
    'smtp_from': SMTP_CONFIG.from,
    'email_verification': 'true',
    'rtmp_host': RTMP_HOST
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    await run('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT (k) DO NOTHING', [k, v]);
  }
}

export function getPool() {
  return pool;
}

function toPgSql(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

async function execute(sql, params = []) {
  return pool.query(toPgSql(sql), params);
}

async function get(sql, params = []) {
  const result = await execute(sql, params);
  return result.rows[0];
}

async function all(sql, params = []) {
  const result = await execute(sql, params);
  return result.rows;
}

async function run(sql, params = []) {
  const query = sql.trim();
  const needsReturningId =
    /^insert\s+into\s+(users|notices|live_channels|live_schedules|email_verifications)\b/i.test(query) &&
    !/returning\s+/i.test(query);
  const finalSql = needsReturningId ? `${query} RETURNING id` : query;
  const result = await execute(finalSql, params);
  return {
    lastInsertRowid: result.rows?.[0]?.id,
    affectedRows: result.rowCount
  };
}

export default {
  execute,
  query: all,
  get,
  run,
  all
};
