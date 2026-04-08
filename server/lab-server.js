import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialSnapshot } from './default-snapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const dataDir = process.env.LAB_MANAGER_DATA_DIR
  ? path.resolve(projectRoot, process.env.LAB_MANAGER_DATA_DIR)
  : path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'lab-data.json');
const port = Number(process.env.PORT ?? 3000);

const INVENTORY_CATEGORIES = new Set(['protein', 'antibody', 'reagent', 'other']);
const ORDER_STATUSES = new Set(['draft', 'submitted', 'approved', 'received']);
const PROTOCOL_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
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
const eventClients = new Set();

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function asObject(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  return value;
}

function readRequiredString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

function readOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value, fieldName, minimum = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new HttpError(400, `${fieldName} must be a number >= ${minimum}.`);
  }

  return parsed;
}

function readEnum(value, fieldName, allowedValues) {
  if (typeof value !== 'string' || !allowedValues.has(value)) {
    throw new HttpError(400, `${fieldName} is invalid.`);
  }

  return value;
}

function readArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} must be an array.`);
  }

  return value;
}

function normalizeInventoryDraft(input) {
  const payload = asObject(input);

  return {
    name: readRequiredString(payload.name, 'Inventory name'),
    category: readEnum(payload.category, 'Inventory category', INVENTORY_CATEGORIES),
    quantity: readNumber(payload.quantity, 'Inventory quantity', 0),
    unit: readRequiredString(payload.unit, 'Inventory unit'),
    minQuantity: readNumber(payload.minQuantity, 'Inventory minimum quantity', 0),
    expiryDate: readOptionalString(payload.expiryDate) || null,
    location: readOptionalString(payload.location),
    notes: readOptionalString(payload.notes),
  };
}

function normalizeOrderDraft(input) {
  const payload = asObject(input);
  const lines = readArray(payload.items, 'Order items').map((line) => {
    const linePayload = asObject(line);
    const quantity = readNumber(linePayload.quantity, 'Order item quantity', 0.000001);
    const unitPrice = readNumber(linePayload.unitPrice, 'Order item unit price', 0);

    return {
      id: createId('order_item'),
      itemName: readRequiredString(linePayload.itemName, 'Order item name'),
      quantity,
      unitPrice,
      totalPrice: Math.round(quantity * unitPrice),
    };
  });

  if (lines.length === 0) {
    throw new HttpError(400, 'At least one order item is required.');
  }

  return {
    orderNumber: readRequiredString(payload.orderNumber, 'Order number'),
    status: readEnum(payload.status, 'Order status', ORDER_STATUSES),
    notes: readOptionalString(payload.notes),
    items: lines,
    totalAmount: lines.reduce((sum, line) => sum + line.totalPrice, 0),
  };
}

function normalizeProtocolDraft(input) {
  const payload = asObject(input);
  const rawSteps = readArray(payload.steps, 'Protocol steps');

  const steps = rawSteps
    .map((step, index) => {
      const stepPayload = asObject(step);
      const title = readRequiredString(stepPayload.title, `Protocol step ${index + 1} title`);

      return {
        id: createId('step'),
        stepNumber: index + 1,
        title,
        description: readRequiredString(stepPayload.description, `Protocol step ${index + 1} description`),
        duration: readOptionalString(stepPayload.duration),
        materials: readArray(stepPayload.materials, `Protocol step ${index + 1} materials`)
          .map((material) => readRequiredString(material, `Protocol step ${index + 1} material`)),
      };
    })
    .filter(Boolean);

  if (steps.length === 0) {
    throw new HttpError(400, 'At least one protocol step is required.');
  }

  return {
    title: readRequiredString(payload.title, 'Protocol title'),
    category: readRequiredString(payload.category, 'Protocol category'),
    description: readOptionalString(payload.description),
    estimatedTime: readOptionalString(payload.estimatedTime),
    difficulty: readEnum(payload.difficulty, 'Protocol difficulty', PROTOCOL_DIFFICULTIES),
    steps,
  };
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    throw new HttpError(400, 'Request body is missing.');
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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

function broadcastSnapshotUpdate(updatedAt) {
  const payload = `data: ${JSON.stringify({ type: 'snapshot-updated', updatedAt })}\n\n`;

  for (const client of eventClients) {
    try {
      client.write(payload);
    } catch {
      eventClients.delete(client);
    }
  }
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
  broadcastSnapshotUpdate(nextSnapshot.updatedAt);
  return nextSnapshot;
}

function queueMutation(mutator) {
  const task = writeQueue.then(async () => {
    const currentSnapshot = await readSnapshot();
    const { nextSnapshot, result } = await mutator(currentSnapshot);
    const savedSnapshot = await saveSnapshot(nextSnapshot);
    return {
      snapshot: savedSnapshot,
      result,
    };
  });

  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

async function createInventoryItem(payload) {
  const draft = normalizeInventoryDraft(payload);
  const now = new Date().toISOString();
  const createdItem = {
    id: createId('inv'),
    ...draft,
    createdAt: now,
    updatedAt: now,
  };

  const { result } = await queueMutation((snapshot) => ({
    nextSnapshot: {
      ...snapshot,
      inventory: [createdItem, ...snapshot.inventory],
    },
    result: createdItem,
  }));

  return result;
}

async function updateInventoryItem(id, payload) {
  const draft = normalizeInventoryDraft(payload);
  const { result } = await queueMutation((snapshot) => {
    const existingItem = snapshot.inventory.find((item) => item.id === id);

    if (!existingItem) {
      throw new HttpError(404, 'Inventory item not found.');
    }

    const updatedItem = {
      ...existingItem,
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    return {
      nextSnapshot: {
        ...snapshot,
        inventory: snapshot.inventory.map((item) => (item.id === id ? updatedItem : item)),
      },
      result: updatedItem,
    };
  });

  return result;
}

async function deleteInventoryItem(id) {
  await queueMutation((snapshot) => {
    const nextInventory = snapshot.inventory.filter((item) => item.id !== id);

    if (nextInventory.length === snapshot.inventory.length) {
      throw new HttpError(404, 'Inventory item not found.');
    }

    return {
      nextSnapshot: {
        ...snapshot,
        inventory: nextInventory,
      },
      result: { success: true },
    };
  });
}

async function createOrder(payload) {
  const draft = normalizeOrderDraft(payload);
  const now = new Date().toISOString();
  const createdOrder = {
    id: createId('ord'),
    ...draft,
    createdAt: now,
    updatedAt: now,
  };

  const { result } = await queueMutation((snapshot) => ({
    nextSnapshot: {
      ...snapshot,
      orders: [createdOrder, ...snapshot.orders],
    },
    result: createdOrder,
  }));

  return result;
}

async function updateOrder(id, payload) {
  const draft = normalizeOrderDraft(payload);
  const { result } = await queueMutation((snapshot) => {
    const existingOrder = snapshot.orders.find((order) => order.id === id);

    if (!existingOrder) {
      throw new HttpError(404, 'Order not found.');
    }

    const updatedOrder = {
      ...existingOrder,
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    return {
      nextSnapshot: {
        ...snapshot,
        orders: snapshot.orders.map((order) => (order.id === id ? updatedOrder : order)),
      },
      result: updatedOrder,
    };
  });

  return result;
}

async function deleteOrder(id) {
  await queueMutation((snapshot) => {
    const nextOrders = snapshot.orders.filter((order) => order.id !== id);

    if (nextOrders.length === snapshot.orders.length) {
      throw new HttpError(404, 'Order not found.');
    }

    return {
      nextSnapshot: {
        ...snapshot,
        orders: nextOrders,
      },
      result: { success: true },
    };
  });
}

async function createProtocol(payload) {
  const draft = normalizeProtocolDraft(payload);
  const now = new Date().toISOString();
  const createdProtocol = {
    id: createId('prot'),
    ...draft,
    createdAt: now,
    updatedAt: now,
  };

  const { result } = await queueMutation((snapshot) => ({
    nextSnapshot: {
      ...snapshot,
      protocols: [createdProtocol, ...snapshot.protocols],
    },
    result: createdProtocol,
  }));

  return result;
}

async function updateProtocol(id, payload) {
  const draft = normalizeProtocolDraft(payload);
  const { result } = await queueMutation((snapshot) => {
    const existingProtocol = snapshot.protocols.find((protocol) => protocol.id === id);

    if (!existingProtocol) {
      throw new HttpError(404, 'Protocol not found.');
    }

    const updatedProtocol = {
      ...existingProtocol,
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    return {
      nextSnapshot: {
        ...snapshot,
        protocols: snapshot.protocols.map((protocol) => (protocol.id === id ? updatedProtocol : protocol)),
      },
      result: updatedProtocol,
    };
  });

  return result;
}

async function deleteProtocol(id) {
  await queueMutation((snapshot) => {
    const nextProtocols = snapshot.protocols.filter((protocol) => protocol.id !== id);

    if (nextProtocols.length === snapshot.protocols.length) {
      throw new HttpError(404, 'Protocol not found.');
    }

    return {
      nextSnapshot: {
        ...snapshot,
        protocols: nextProtocols,
      },
      result: { success: true },
    };
  });
}

function openEventStream(req, res) {
  setCommonHeaders(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'snapshot-updated', updatedAt: new Date().toISOString() })}\n\n`);

  const heartbeatId = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  eventClients.add(res);

  req.on('close', () => {
    clearInterval(heartbeatId);
    eventClients.delete(res);
  });
}

async function serveStaticAsset(res, pathname) {
  const requestedPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDir, requestedPath);

  if (!resolvedPath.startsWith(distDir)) {
    throw new HttpError(403, 'Access denied.');
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
        'Frontend assets are not built yet. Run `npm run build` before using `npm run start`.',
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
  sendJson(res, 500, { message: 'Internal server error.' });
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

    if (url.pathname === '/api/events' && method === 'GET') {
      openEventStream(req, res);
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
        throw new HttpError(404, 'API endpoint not found.');
      }

      if (segments.length === 2 && method === 'GET') {
        const snapshot = await readSnapshot();
        sendJson(res, 200, snapshot[collection]);
        return;
      }

      if (collection === 'inventory' && segments.length === 2 && method === 'POST') {
        sendJson(res, 201, await createInventoryItem(await readJsonBody(req)));
        return;
      }

      if (collection === 'orders' && segments.length === 2 && method === 'POST') {
        sendJson(res, 201, await createOrder(await readJsonBody(req)));
        return;
      }

      if (collection === 'protocols' && segments.length === 2 && method === 'POST') {
        sendJson(res, 201, await createProtocol(await readJsonBody(req)));
        return;
      }

      if (segments.length === 3 && method === 'PUT') {
        const id = decodeURIComponent(segments[2]);
        const body = await readJsonBody(req);

        if (collection === 'inventory') {
          sendJson(res, 200, await updateInventoryItem(id, body));
          return;
        }

        if (collection === 'orders') {
          sendJson(res, 200, await updateOrder(id, body));
          return;
        }

        if (collection === 'protocols') {
          sendJson(res, 200, await updateProtocol(id, body));
          return;
        }
      }

      if (segments.length === 3 && method === 'DELETE') {
        const id = decodeURIComponent(segments[2]);

        if (collection === 'inventory') {
          await deleteInventoryItem(id);
          sendJson(res, 200, { success: true });
          return;
        }

        if (collection === 'orders') {
          await deleteOrder(id);
          sendJson(res, 200, { success: true });
          return;
        }

        if (collection === 'protocols') {
          await deleteProtocol(id);
          sendJson(res, 200, { success: true });
          return;
        }
      }

      throw new HttpError(405, 'This method is not implemented for the selected endpoint.');
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
