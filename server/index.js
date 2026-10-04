import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

const dataDir = join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });
const db = new Database(join(dataDir, 'notes.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    color TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )
`);

const colors = ['#fff0a8', '#ffdcd7', '#d9f2de', '#e6dcff', '#d9efff', '#ffe1ef'];
const starters = [
  ['Little things, big joy ✨', 'Fresh sheets, a really good cup of tea, and that song you forgot you loved.', 1],
  ['Weekend wishlist', '🌷 Wander somewhere new\n🥐 Find the flakiest croissant\n📚 Read in the sunshine', 0],
  ['A tiny reminder', 'You don’t have to have it all figured out today. One thing at a time 💛', 1],
  ['Pasta night 🍋', 'Lemony pasta\nParmesan (lots)\nA handful of basil\nGarlic bread for the table', 0],
  ['Ideas for later', '• Start a little herb garden\n• Send that postcard\n• Make a playlist for rainy days', 0],
];
if (db.pragma('user_version', { simple: true }) === 0) {
  const insert = db.prepare('INSERT INTO notes (id, title, body, color, pinned, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const seed = db.transaction(() => starters.forEach(([title, body, pinned], index) => insert.run(randomUUID(), title, body, colors[index], pinned, Date.now() - index * 3_600_000)));
  seed();
  db.pragma('user_version = 1');
}

const app = new Hono();
const selectNotes = db.prepare('SELECT id, title, body, color, pinned, updated_at AS updatedAt FROM notes ORDER BY pinned DESC, updated_at DESC');
const allowedColors = new Set(colors);

function validNote(value) {
  return value &&
    typeof value.title === 'string' && value.title.length <= 200 &&
    typeof value.body === 'string' && value.body.length <= 20_000 &&
    allowedColors.has(value.color) && typeof value.pinned === 'boolean';
}

function noteFromRow(row) {
  return { ...row, pinned: Boolean(row.pinned) };
}

app.get('/api/notes', (c) => c.json(selectNotes.all().map(noteFromRow)));

app.post('/api/notes', async (c) => {
  const value = await c.req.json().catch(() => null);
  if (!validNote(value) || (!value.title.trim() && !value.body.trim())) {
    return c.json({ error: 'Enter a title or some note text.' }, 400);
  }
  const note = { id: randomUUID(), title: value.title.trim() || 'A little thought', body: value.body.trim(), color: value.color, pinned: value.pinned, updatedAt: Date.now() };
  db.prepare('INSERT INTO notes (id, title, body, color, pinned, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(note.id, note.title, note.body, note.color, Number(note.pinned), note.updatedAt);
  return c.json(note, 201);
});

app.patch('/api/notes/:id', async (c) => {
  const value = await c.req.json().catch(() => null);
  if (!validNote(value) || (!value.title.trim() && !value.body.trim())) {
    return c.json({ error: 'Enter a title or some note text.' }, 400);
  }
  const updatedAt = Date.now();
  const result = db.prepare('UPDATE notes SET title = ?, body = ?, color = ?, pinned = ?, updated_at = ? WHERE id = ?')
    .run(value.title.trim() || 'A little thought', value.body.trim(), value.color, Number(value.pinned), updatedAt, c.req.param('id'));
  if (!result.changes) return c.json({ error: 'Note not found.' }, 404);
  return c.json({ ...value, id: c.req.param('id'), title: value.title.trim() || 'A little thought', body: value.body.trim(), updatedAt });
});

app.delete('/api/notes/:id', (c) => {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(c.req.param('id'));
  return result.changes ? c.body(null, 204) : c.json({ error: 'Note not found.' }, 404);
});

app.get('/', serveStatic({ path: './dist/index.html' }));
app.use('/assets/*', serveStatic({ root: './dist' }));

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Little Notes server listening on http://localhost:${info.port}`);
});
