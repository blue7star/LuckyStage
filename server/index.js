import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './db.js';
import { createAuth } from './security.js';
import { createApp } from './http.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 须为有效端口');
const store = createStore(dataDir);
const auth = createAuth(process.env.ADMIN_PASSWORD, process.env.SESSION_SECRET);
const app = createApp(store, auth, dataDir, path.join(root, 'web'));
app.listen(port, host, () => console.log(`抽奖系统运行于 http://${host}:${port}`));
