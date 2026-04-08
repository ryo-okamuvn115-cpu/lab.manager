import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialSnapshot } from './defaultSnapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'lab-data.json');
const port = Number(process.env.PORT ?? 3000);

const COLLECTIONS = new Set(['inventory', 'orders', 'protocols']);
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

let writeQueue = Promise.resolve();

function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, status, payload) {
  setCommonHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, message) {
  setCommonHeaders(res);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await saveSnapshot(createInitialSnapshot());
  }
}

async function readSnapshot() {
  await ensureDataFile();

  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    const fallback = createInitialSnapshot();
    return saveSnapshot(fallback);
  }
}

async function saveSnapshot(snapshot) {
  const nextSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(nextSnapshot, null, 2)}\n`, 'utf8');
  return nextSnapshot;
}

function queueMutation(mutator) {
  const task = writeQueue.then(async () => {
    const currentSnapshot = await readSnapshot();
    const nextSnapshot = await mutator(currentSnapshot);
    return saveSnapshot(nextSnapshot);
  });

  writeQueue = task.catch(() => undefined);
  return task;
}

async function deleteFromCollection(collection, id) {
  await queueMutation((snapshot) => {
    const currentItems = snapshot[collection];
    const nextItems = currentItems.filter((item) => item.id !== id);

    if (nextItems.length === currentItems.length) {
      throw new HttpError(404, '対象データが見つかりません。');
    }

    return {
      ...snapshot,
      [collection]: nextItems,
    };
  });
}

async function serveStaticAsset(res, pathname) {
  const requestedPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDir, requestedPath);

  if (!resolvedPath.startsWith(distDir)) {
    throw new HttpError(403, 'アクセスできません。');
  }

  try {
    const file = await fs.readFile(resolvedPath);
    const contentType = CONTENT_TYPES[path.extname(resolvedPath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(file);
    return;
  } catch {
    try {
      const indexFile = await fs.readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexFile);
    } catch {
      sendText(
        res,
        503,
        'フロントエンドがまだビルドされていません。`npm run build` を実行してから `npm run start` を使ってください。',
      );
    }
  }
}

function sendError(res, error) {
  if (error instanceof HttpError) {
    sendJson(res, error.status, { message: error.message });
    return;
  }

  console.error(error);
  sendJson(res, 500, { message: 'サーバー内部でエラーが発生しました。' });
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);

  if (method === 'OPTIONS') {
    setCommonHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/api/snapshot' && method === 'GET') {
      sendJson(res, 200, await readSnapshot());
      return;
    }

    const segments = url.pathname.split('/').filter(Boolean);

    if (segments[0] === 'api') {
      const collection = segments[1];

      if (!collection || !COLLECTIONS.has(collection)) {
        throw new HttpError(404, 'APIエンドポイントが見つかりません。');
      }

      if (segments.length === 2 && method === 'GET') {
        const snapshot = await readSnapshot();
        sendJson(res, 200, snapshot[collection]);
        return;
      }

      if (segments.length === 3 && method === 'DELETE') {
        await deleteFromCollection(collection, decodeURIComponent(segments[2]));
        sendJson(res, 200, { success: true });
        return;
      }

      throw new HttpError(405, 'この操作にはまだ対応していません。');
    }

    await serveStaticAsset(res, url.pathname);
  } catch (error) {
    sendError(res, error);
  }
});

server.listen(port, '0.0.0.0', async () => {
  await ensureDataFile();
  console.log(`Lab Manager server listening on http://0.0.0.0:${port}`);
});
