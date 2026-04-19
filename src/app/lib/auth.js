import jwt from 'jsonwebtoken';

const EXPIRES_IN = '8h';

export function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurada');
  return jwt.sign({ userId }, secret, { expiresIn: EXPIRES_IN, algorithm: 'HS256' });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurada');
  return jwt.verify(token, secret);
}
