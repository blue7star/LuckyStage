import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAuth(password, secret) {
  if (!password || password.length < 6) throw new Error('请设置至少 6 位的 ADMIN_PASSWORD 环境变量');
  if (!secret || secret.length < 32) throw new Error('请设置至少 32 位的 SESSION_SECRET 环境变量');
  const salt = randomBytes(24).toString('hex');
  const passwordHash = createHmac('sha256', salt).update(password).digest('hex');
  const sign = (payload) => createHmac('sha256', secret).update(payload).digest('hex');
  return {
    checkPassword(candidate) {
      return safeEqual(createHmac('sha256', salt).update(String(candidate || '')).digest('hex'), passwordHash);
    },
    issue() {
      const payload = `${Date.now()}.${randomBytes(12).toString('hex')}`;
      return `${payload}.${sign(payload)}`;
    },
    verify(cookieHeader) {
      const token = String(cookieHeader || '').split(';').map((part) => part.trim())
        .find((part) => part.startsWith('lottery_session='))?.slice('lottery_session='.length);
      if (!token) return false;
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const [issued, nonce, signature] = parts;
      const time = Number(issued);
      if (!Number.isFinite(time) || time > Date.now() || Date.now() - time > 12 * 60 * 60 * 1000) return false;
      return /^[a-f0-9]{24}$/.test(nonce) && safeEqual(sign(`${issued}.${nonce}`), signature);
    }
  };
}

export function sessionCookie(token, secure) {
  return `lottery_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure ? '; Secure' : ''}`;
}
