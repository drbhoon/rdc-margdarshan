import { cookies } from 'next/headers';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'margdarshan-super-secret-key-12345';

export interface UserSession {
  employeeCode: string;
  email: string;
  role: 'MENTEE' | 'MENTOR' | 'ADMIN';
  name: string;
}

export function createToken(payload: UserSession): string {
  const payloadStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadStr).toString('base64url');
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(base64Payload);
  const signature = hmac.digest('base64url');
  return `${base64Payload}.${signature}`;
}

export function verifyToken(token: string): UserSession | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(base64Payload);
  const expectedSignature = hmac.digest('base64url');
  if (signature !== expectedSignature) return null;
  
  try {
    const payloadStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    return JSON.parse(payloadStr) as UserSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}
