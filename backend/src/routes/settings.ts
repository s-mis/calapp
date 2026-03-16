import { Router } from 'express';
import db from '../db';

const router = Router();

// GET /api/settings — return all settings as { key: value } object
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

// PUT /api/settings/:key — upsert a single setting
router.put('/:key', (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'value is required' });
  }
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
  res.json({ key, value: String(value) });
});

export default router;
