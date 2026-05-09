import express from 'express';
import db from '../db.js';
import { hashPassword, verifyPassword, generateToken, validatePassword, validateEmail, generateCode } from '../utils/auth.js';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [username, username]);

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });

    res.json({
      token,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username and password required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const registrationEnabled = await db.get('SELECT v FROM settings WHERE k = ?', ['registration_enabled']);
    if (registrationEnabled?.v !== 'true') {
      return res.status(403).json({ error: 'Registration is disabled' });
    }

    const allowedDomain = await db.get('SELECT v FROM settings WHERE k = ?', ['allowed_email_domain']);
    if (allowedDomain?.v && !email.toLowerCase().endsWith('@' + allowedDomain.v.toLowerCase())) {
      return res.status(403).json({ error: 'Email domain not allowed' });
    }

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = hashPassword(password);
    const result = await db.run(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, 'user', new Date().toISOString()]
    );

    res.status(201).json({ message: 'User created', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const registrationEnabled = await db.get('SELECT v FROM settings WHERE k = ?', ['registration_enabled']);
    if (registrationEnabled?.v !== 'true') {
      return res.status(403).json({ error: 'Registration is disabled' });
    }

    const allowedDomain = await db.get('SELECT v FROM settings WHERE k = ?', ['allowed_email_domain']);
    if (allowedDomain?.v && !email.toLowerCase().endsWith('@' + allowedDomain.v.toLowerCase())) {
      return res.status(403).json({ error: 'Email domain not allowed' });
    }

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.run('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)', [email, code, expiresAt]);

    const smtpHost = await db.get('SELECT v FROM settings WHERE k = ?', ['smtp_host']);
    if (smtpHost?.v) {
      sendEmail(email, '验证码', `您的验证码是: ${code}，5分钟内有效。`);
    }

    res.json({ message: 'Code sent' });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const verification = await db.get(
      'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND used = 0 ORDER BY id DESC LIMIT 1',
      [email, code]
    );

    if (!verification) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Code expired' });
    }

    await db.run('UPDATE email_verifications SET used = 1 WHERE id = ?', [verification.id]);

    const sessionToken = generateCode(32);
    res.json({ verified: 'true', sessionToken });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function sendEmail(to, subject, body) {
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpFrom = process.env.SMTP_FROM || '';

  if (!smtpHost) return;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    auth: { user: smtpUser, pass: smtpPass }
  });

  transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text: body
  }).catch(err => console.error('Email send failed:', err));
}

export default router;