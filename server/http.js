import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import QRCode from 'qrcode';
import { defaultEvent } from './config.js';
import { sessionCookie } from './security.js';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(data));
}

async function readJson(req, maxBytes = 4 * 1024 * 1024) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('application/json')) throw new HttpError(415, '请求需要使用 JSON 格式');
  let size = 0;
  const parts = [];
  for await (const part of req) {
    size += part.length;
    if (size > maxBytes) throw new HttpError(413, '提交内容过大');
    parts.push(part);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new HttpError(400, 'JSON 格式不正确'); }
}

function sendFile(res, filename) {
  const stat = fs.statSync(filename);
  res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
    'Content-Length': stat.size, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store' });
  fs.createReadStream(filename).pipe(res);
}

function imageExtension(bytes, requestedType) {
  if (requestedType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (requestedType === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'jpg';
  if (requestedType === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new HttpError(400, '只支持有效的 PNG、JPEG 或 WebP 图片');
}

function secureRequest(req) {
  return !!req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
}

export function createApp(store, auth, dataDir, webDir) {
  const loginAttempts = new Map();
  const uploadDir = path.join(dataDir, 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      const method = req.method;
      if (pathname === '/api/health' && method === 'GET') return json(res, 200, { ok: true });

      if (pathname === '/api/admin/login' && method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        const previous = loginAttempts.get(ip);
        const state = previous && previous.until > Date.now() ? previous : { count: 0, until: 0 };
        if (state.count >= 10 && state.until > Date.now()) throw new HttpError(429, '尝试次数过多，请稍后再试');
        const body = await readJson(req, 1024);
        if (!auth.checkPassword(body.password)) {
          loginAttempts.set(ip, { count: state.count + 1, until: Date.now() + 15 * 60 * 1000 });
          throw new HttpError(401, '密码不正确');
        }
        loginAttempts.delete(ip);
        return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(auth.issue(), secureRequest(req)) });
      }

      const publicEventMatch = pathname.match(/^\/api\/public\/events\/([a-f0-9]{16})(?:\/(register|results|sample|stream))?$/);
      if (publicEventMatch) {
        const [, id, operation] = publicEventMatch;
        if (!operation && method === 'GET') {
          const event = store.publicEvent(id);
          if (!event) throw new HttpError(404, '活动不存在');
          return json(res, 200, event);
        }
        if (operation === 'results' && method === 'GET') {
          const results = store.listResults(id);
          if (!results) throw new HttpError(404, '活动不存在');
          return json(res, 200, { results });
        }
        if (operation === 'sample' && method === 'GET') {
          const pool = store.participantPool(id);
          if (!pool) throw new HttpError(404, '活动不存在');
          return json(res, 200, { participants: pool });
        }
        if (operation === 'stream' && method === 'GET') {
          const event = store.publicEvent(id);
          if (!event) throw new HttpError(404, '活动不存在');
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
          const send = (type, data) => { try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch {} };
          const unsubscribe = store.subscribe(id, (type, payload) => send(type, payload));
          send('snapshot', { event, results: store.listResults(id) });
          const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
          req.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
          return;
        }
        if (operation === 'register' && method === 'POST') {
          const result = store.register(id, (await readJson(req, 16 * 1024)).values);
          if (!result) throw new HttpError(404, '活动不存在');
          return json(res, 200, result);
        }
      }

      if (pathname.startsWith('/api/admin/')) {
        if (!auth.verify(req.headers.cookie)) throw new HttpError(401, '请先登录');
        if (pathname === '/api/admin/me' && method === 'GET') return json(res, 200, { ok: true });
        if (pathname === '/api/admin/logout' && method === 'POST') return json(res, 200, { ok: true },
          { 'Set-Cookie': 'lottery_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
        if (pathname === '/api/admin/events') {
          if (method === 'GET') return json(res, 200, { events: store.listEvents() });
          if (method === 'POST') return json(res, 201, store.createEvent(await readJson(req) || defaultEvent()));
        }
        if (pathname === '/api/admin/uploads' && method === 'POST') {
          const body = await readJson(req, 3 * 1024 * 1024);
          if (typeof body.base64 !== 'string') throw new HttpError(400, '图片数据缺失');
          const bytes = Buffer.from(body.base64, 'base64');
          if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new HttpError(400, '图片不得超过 2 MB');
          const extension = imageExtension(bytes, body.type);
          const filename = `${randomBytes(12).toString('hex')}.${extension}`;
          fs.writeFileSync(path.join(uploadDir, filename), bytes, { flag: 'wx' });
          return json(res, 201, { path: `/uploads/${filename}` });
        }
        const match = pathname.match(/^\/api\/admin\/events\/([a-f0-9]{16})(?:\/(participants|import|results|draw|code))?$/);
        if (match) {
          const [, id, operation] = match;
          if (!operation && method === 'GET') {
            const event = store.getEvent(id);
            if (!event) throw new HttpError(404, '活动不存在');
            return json(res, 200, event);
          }
          if (!operation && method === 'PUT') {
            const event = store.updateEvent(id, await readJson(req));
            if (!event) throw new HttpError(404, '活动不存在');
            return json(res, 200, event);
          }
          if (operation === 'participants' && method === 'GET') {
            const people = store.listParticipants(id);
            if (!people) throw new HttpError(404, '活动不存在');
            return json(res, 200, { participants: people });
          }
          if (operation === 'import' && method === 'POST') {
            const event = store.getEvent(id);
            if (!event) throw new HttpError(404, '活动不存在');
            if (!['import', 'both'].includes(event.registrationMode)) throw new Error('本活动未启用名单导入');
            const report = store.insertParticipants(id, (await readJson(req)).rows, 'import');
            return json(res, 200, report);
          }
          if (operation === 'results' && method === 'GET') {
            const results = store.listResults(id);
            if (!results) throw new HttpError(404, '活动不存在');
            return json(res, 200, { results });
          }
          if (operation === 'draw' && method === 'POST') {
            const { roundId, prizeId } = await readJson(req, 4096);
            const result = store.drawPrize(id, roundId, prizeId);
            if (!result) throw new HttpError(404, '活动不存在');
            return json(res, 200, result);
          }
          if (operation === 'code' && method === 'GET') {
            if (!store.getEvent(id)) throw new HttpError(404, '活动不存在');
            const originText = url.searchParams.get('origin');
            if (!originText || originText.length > 2048) throw new HttpError(400, '报名地址无效');
            let origin;
            try { origin = new URL(originText); }
            catch { throw new HttpError(400, '报名地址无效'); }
            if (!['http:', 'https:'].includes(origin.protocol) || origin.href !== origin.origin + '/' ||
              origin.username || origin.password) throw new HttpError(400, '报名地址无效');
            const eventUrl = `${origin.origin}/event?id=${encodeURIComponent(id)}`;
            const code = await QRCode.toBuffer(eventUrl, { type: 'png', width: 420, margin: 2, errorCorrectionLevel: 'M' });
            res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': code.length,
              'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            return res.end(code);
          }
        }
      }

      if (method === 'GET') {
        if (pathname === '/' || pathname === '/admin') return sendFile(res, path.join(webDir, 'index.html'));
        if (pathname === '/live') return sendFile(res, path.join(webDir, 'live.html'));
        if (pathname === '/demo') return sendFile(res, path.join(webDir, 'demo.html'));
        if (pathname === '/event' || pathname === '/results') return sendFile(res, path.join(webDir, `${pathname.slice(1)}.html`));
        if (/^\/(admin|live|event|demo|screen)\.(css|js)$/.test(pathname)) return sendFile(res, path.join(webDir, pathname.slice(1)));
        if (/^\/assets\/[\w-]+\.(png|webp|jpg)$/.test(pathname)) return sendFile(res, path.join(webDir, pathname.slice(1)));
        if (/^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(pathname)) {
          const filename = path.join(uploadDir, path.basename(pathname));
          if (fs.existsSync(filename)) return sendFile(res, filename);
        }
      }
      throw new HttpError(404, '页面或接口不存在');
    } catch (error) {
      if (!res.headersSent) json(res, error.status || 400, { error: error.message || '请求失败' });
      else res.destroy();
    }
  });
}
