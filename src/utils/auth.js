import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = '1298b2189f52a07029b725b4050504bae9c4472cb3e892226b6d1b4d85c877d8';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function generateCode(length = 6) {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

export function generateStreamKey() {
  return crypto.randomBytes(24).toString('hex');
}

export function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain number';
  }
  return '';
}

export function validateEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
