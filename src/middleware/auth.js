import { verifyToken } from '../utils/auth.js';

export async function authMiddleware(req, reply) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Authorization required' });
    return;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    reply.status(401).send({ error: 'Invalid token' });
    return;
  }

  req.user = decoded;
}

export async function adminMiddleware(req, reply) {
  await authMiddleware(req, reply);
  if (reply.sent) return;

  if (req.user.role !== 'admin') {
    reply.status(403).send({ error: 'Admin access required' });
  }
}

export function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}
