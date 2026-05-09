import mysql from 'mysql2/promise';

let pool = null;

export async function initDatabase() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = process.env.MYSQL_PORT || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'schoolportal';

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at VARCHAR(100) NOT NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      tag VARCHAR(100) NOT NULL,
      published_at VARCHAR(100) NOT NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS live_channels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at VARCHAR(100) NOT NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS live_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      channel_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      start_time VARCHAR(100) NOT NULL,
      end_time VARCHAR(100),
      stream_key VARCHAR(255) NOT NULL,
      user_id INT NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at VARCHAR(100) NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES live_channels(id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS portal_stats (
      k VARCHAR(100) PRIMARY KEY,
      v INT NOT NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      k VARCHAR(100) PRIMARY KEY,
      v TEXT NOT NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(50) NOT NULL,
      expires_at VARCHAR(100) NOT NULL,
      used INT DEFAULT 0
    )
  `);

  await seedData();
}

async function seedData() {
  const [notices] = await pool.execute('SELECT COUNT(*) as count FROM notices');
  if (notices[0].count === 0) {
    const now = new Date().toISOString();
    await pool.execute('INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)', ['欢迎使用校园门户平台', '公告', now]);
    await pool.execute('INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)', ['关于近期网络维护的通知', '信息中心', now]);
    await pool.execute('INSERT INTO notices (title, tag, published_at) VALUES (?, ?, ?)', ['本周学术讲座安排', '学术', now]);
  }

  const [channels] = await pool.execute('SELECT COUNT(*) as count FROM live_channels');
  if (channels[0].count === 0) {
    const now = new Date().toISOString();
    await pool.execute('INSERT INTO live_channels (name, description, created_at) VALUES (?, ?, ?)', ['主频道', '学校官方直播频道', now]);
    await pool.execute('INSERT INTO live_channels (name, description, created_at) VALUES (?, ?, ?)', ['教学频道', '用于在线课程直播', now]);
  }

  const [stats] = await pool.execute('SELECT COUNT(*) as count FROM portal_stats');
  if (stats[0].count === 0) {
    await pool.execute('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['students', 3248]);
    await pool.execute('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['courses', 42]);
    await pool.execute('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['todos', 12]);
    await pool.execute('INSERT INTO portal_stats (k, v) VALUES (?, ?)', ['activities', 6]);
  }

  const defaultSettings = {
    'registration_enabled': 'true',
    'allowed_email_domain': '',
    'smtp_host': '',
    'smtp_port': '587',
    'smtp_username': '',
    'smtp_password': '',
    'smtp_from': '',
    'email_verification': 'true',
    'rtmp_host': 'localhost'
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    await pool.execute('INSERT IGNORE INTO settings (k, v) VALUES (?, ?)', [k, v]);
  }
}

export function getPool() {
  return pool;
}

export default {
  execute: async (sql, params) => {
    const [result] = await pool.execute(sql, params);
    return result;
  },
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  get: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows[0];
  },
  run: async (sql, params) => {
    const [result] = await pool.execute(sql, params);
    return { lastInsertRowid: result.insertId, affectedRows: result.affectedRows };
  },
  all: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
};