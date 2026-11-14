import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  type CardConfigPayload,
  DEFAULT_CARD_CONFIG,
  type ReplyEntry,
} from './src/data/cardDefaults.ts';

interface PersistedStore {
  card: CardConfigPayload;
  replies: ReplyEntry[];
  adminPassHash: string;
  hmacSecret: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'card-config.json');
const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_PASSCODE = process.env.ADMIN_PASSCODE || '1200';

function normalizePasscode(passcode: string): string {
  const bnDigits = '০১২৩৪৫৬৭৮৯';
  return passcode
    .trim()
    .replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
}

function hashPasscode(passcode: string): string {
  const clean = normalizePasscode(passcode);
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(clean, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscode(passcode: string, stored: string): boolean {
  const clean = normalizePasscode(passcode);
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = crypto.scryptSync(clean, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function signToken(secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 24 * 7, nonce: crypto.randomBytes(8).toString('hex') })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest();
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sig, 'base64url');
  } catch {
    return false;
  }
  if (expectedSig.length !== providedSig.length) return false;
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

let storeCache: PersistedStore | null = null;

async function ensureStore(): Promise<PersistedStore> {
  if (storeCache) return storeCache;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedStore>;
    storeCache = {
      card: parsed.card ?? structuredClone(DEFAULT_CARD_CONFIG),
      replies: Array.isArray(parsed.replies) ? parsed.replies : [],
      adminPassHash: parsed.adminPassHash || hashPasscode(DEFAULT_PASSCODE),
      hmacSecret: parsed.hmacSecret || crypto.randomBytes(32).toString('hex'),
    };
  } catch {
    storeCache = {
      card: structuredClone(DEFAULT_CARD_CONFIG),
      replies: [],
      adminPassHash: hashPasscode(DEFAULT_PASSCODE),
      hmacSecret: crypto.randomBytes(32).toString('hex'),
    };
    await saveStore(storeCache);
  }
  return storeCache;
}

async function saveStore(store: PersistedStore): Promise<void> {
  storeCache = store;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function sanitizeCardPayload(input: unknown, fallback: CardConfigPayload): CardConfigPayload {
  if (!input || typeof input !== 'object') return fallback;
  const obj = input as Partial<CardConfigPayload>;
  return {
    bn: obj.bn && typeof obj.bn === 'object' ? { ...fallback.bn, ...obj.bn, lang: 'bn', occasion: 'birthday' } : fallback.bn,
    en: obj.en && typeof obj.en === 'object' ? { ...fallback.en, ...obj.en, lang: 'en', occasion: 'birthday' } : fallback.en,
    photos: Array.isArray(obj.photos) ? obj.photos.filter((p): p is string => typeof p === 'string').slice(0, 8) : fallback.photos,
    music:
      obj.music && typeof obj.music === 'object'
        ? {
            title: String(obj.music.title ?? fallback.music.title).slice(0, 140),
            artist: String(obj.music.artist ?? fallback.music.artist).slice(0, 140),
            credit: String(obj.music.credit ?? fallback.music.credit).slice(0, 180),
            src: String(obj.music.src || fallback.music.src).slice(0, 500),
          }
        : fallback.music,
  };
}

async function startServer() {
  await ensureStore();
  const app = express();
  app.use(express.json({ limit: '16mb' }));

  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const store = await ensureStore();
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token || !verifyToken(token, store.hmacSecret)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };

  app.get('/uploads/:filename', async (req, res) => {
    const safeName = path.basename(req.params.filename);
    if (!/^[a-zA-Z0-9._-]+$/.test(safeName)) {
      res.status(400).end();
      return;
    }
    const target = path.join(UPLOADS_DIR, safeName);
    try {
      await fs.access(target);
      res.sendFile(target);
    } catch {
      res.status(404).end();
    }
  });

  app.get('/api/card', async (_req, res) => {
    const store = await ensureStore();
    res.json(store.card);
  });

  app.post('/api/replies', async (req, res) => {
    const body = req.body as { message?: unknown; lang?: unknown };
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 600) : '';
    const lang = body?.lang === 'en' ? 'en' : 'bn';
    if (!message) {
      res.status(400).json({ ok: false, error: 'Empty message' });
      return;
    }
    const store = await ensureStore();
    store.replies.unshift({
      id: crypto.randomUUID(),
      message,
      lang,
      createdAt: new Date().toISOString(),
    });
    store.replies = store.replies.slice(0, 100);
    await saveStore(store);
    res.json({ ok: true });
  });

  app.post('/api/admin/login', async (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    const store = await ensureStore();
    if (!verifyPasscode(passcode, store.adminPassHash)) {
      res.status(401).json({ ok: false, error: 'Invalid passcode' });
      return;
    }
    res.json({ ok: true, token: signToken(store.hmacSecret) });
  });

  app.get('/api/admin/state', requireAdmin, async (_req, res) => {
    const store = await ensureStore();
    res.json({ card: store.card, replies: store.replies });
  });

  app.put('/api/admin/card', requireAdmin, async (req, res) => {
    const store = await ensureStore();
    store.card = sanitizeCardPayload(req.body, store.card);
    await saveStore(store);
    res.json({ ok: true, card: store.card });
  });

  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    const body = req.body as { dataUrl?: unknown; filename?: unknown };
    const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl : '';
    const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif)|audio\/(?:mpeg|mp3|mp4|ogg|wav));base64,([A-Za-z0-9+/=]+)$/.exec(
      dataUrl
    );
    if (!match) {
      res.status(400).json({ error: 'Unsupported file format' });
      return;
    }
    const mime = match[1];
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > 12 * 1024 * 1024) {
      res.status(413).json({ error: 'File too large (max 12MB)' });
      return;
    }
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
    };
    const ext = extMap[mime] || 'bin';
    const fileId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, fileId), buf);
    res.json({ url: `/uploads/${fileId}` });
  });

  app.post('/api/admin/passcode', requireAdmin, async (req, res) => {
    const current = typeof req.body?.currentPasscode === 'string' ? req.body.currentPasscode : '';
    const nextPass =
      typeof req.body?.newPasscode === 'string' ? normalizePasscode(req.body.newPasscode) : '';
    if (nextPass.length < 4 || nextPass.length > 64) {
      res.status(400).json({ error: 'Passcode must be 4-64 characters' });
      return;
    }
    const store = await ensureStore();
    if (!verifyPasscode(current, store.adminPassHash)) {
      res.status(401).json({ error: 'Current passcode is incorrect' });
      return;
    }
    store.adminPassHash = hashPasscode(nextPass);
    await saveStore(store);
    res.json({ ok: true });
  });

  app.delete('/api/admin/replies/:id', requireAdmin, async (req, res) => {
    const store = await ensureStore();
    store.replies = store.replies.filter((r) => r.id !== req.params.id);
    await saveStore(store);
    res.json({ ok: true, replies: store.replies });
  });

  app.post('/api/admin/reset', requireAdmin, async (_req, res) => {
    const store = await ensureStore();
    store.card = structuredClone(DEFAULT_CARD_CONFIG);
    await saveStore(store);
    res.json({ ok: true, card: store.card });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Birthday card server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
