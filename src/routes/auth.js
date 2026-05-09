import db from '../db.js';
import { hashPassword, verifyPassword, generateToken, validatePassword, validateEmail, generateCode } from '../utils/auth.js';
import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
  host: 'smtp.qq.com',
  port: 587,
  user: '1519732521@qq.com',
  pass: 'olewrrnmqbufgfcj',
  from: '1519732521@qq.com'
};

export default async function authRoutes(fastify) {
  fastify.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).send({ error: 'Email and password required' });
      }

      const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [username, username]);

      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).send({ error: 'Invalid credentials' });
      }

      const token = generateToken({ id: user.id, username: user.username, role: user.role });

      return {
        token,
        username: user.username,
        role: user.role
      };
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/register', async (req, res) => {
    try {
      const { email, username, password } = req.body || {};

      if (!email || !username || !password) {
        return res.status(400).send({ error: 'Email, username and password required' });
      }

      if (!validateEmail(email)) {
        return res.status(400).send({ error: 'Invalid email format' });
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).send({ error: passwordError });
      }

      const registrationEnabled = await db.get('SELECT v FROM settings WHERE k = ?', ['registration_enabled']);
      if (registrationEnabled?.v !== 'true') {
        return res.status(403).send({ error: 'Registration is disabled' });
      }

      const allowedDomain = await db.get('SELECT v FROM settings WHERE k = ?', ['allowed_email_domain']);
      if (allowedDomain?.v && !email.toLowerCase().endsWith(`@${allowedDomain.v.toLowerCase()}`)) {
        return res.status(403).send({ error: 'Email domain not allowed' });
      }

      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(409).send({ error: 'Email already registered' });
      }

      const hashedPassword = hashPassword(password);
      const result = await db.run(
        'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, 'user', new Date().toISOString()]
      );

      return res.status(201).send({ message: 'User created', id: result.lastInsertRowid });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/send-code', async (req, res) => {
    try {
      const { email } = req.body || {};

      if (!email || !validateEmail(email)) {
        return res.status(400).send({ error: 'Valid email required' });
      }

      const registrationEnabled = await db.get('SELECT v FROM settings WHERE k = ?', ['registration_enabled']);
      if (registrationEnabled?.v !== 'true') {
        return res.status(403).send({ error: 'Registration is disabled' });
      }

      const allowedDomain = await db.get('SELECT v FROM settings WHERE k = ?', ['allowed_email_domain']);
      if (allowedDomain?.v && !email.toLowerCase().endsWith(`@${allowedDomain.v.toLowerCase()}`)) {
        return res.status(403).send({ error: 'Email domain not allowed' });
      }

      const code = generateCode(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await db.run('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)', [email, code, expiresAt]);

      const smtpHost = await db.get('SELECT v FROM settings WHERE k = ?', ['smtp_host']);
      if (smtpHost?.v) {
        sendEmail(email, '验证码', `您的验证码是: ${code}，5分钟内有效。`);
      }

      return { message: 'Code sent' };
    } catch (error) {
      console.error('Send code error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/verify-code', async (req, res) => {
    try {
      const { email, code } = req.body || {};

      const verification = await db.get(
        'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND used = 0 ORDER BY id DESC LIMIT 1',
        [email, code]
      );

      if (!verification) {
        return res.status(401).send({ error: 'Invalid or expired code' });
      }

      if (new Date(verification.expires_at) < new Date()) {
        return res.status(401).send({ error: 'Code expired' });
      }

      await db.run('UPDATE email_verifications SET used = 1 WHERE id = ?', [verification.id]);

      const sessionToken = generateCode(32);
      return { verified: 'true', sessionToken };
    } catch (error) {
      console.error('Verify code error:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  });
}

function sendEmail(to, subject, body) {
  if (!SMTP_CONFIG.host) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    auth: { user: SMTP_CONFIG.user, pass: SMTP_CONFIG.pass }
  });

  transporter.sendMail({
    from: SMTP_CONFIG.from,
    to,
    subject,
    text: body
  }).catch(err => console.error('Email send failed:', err));
}
