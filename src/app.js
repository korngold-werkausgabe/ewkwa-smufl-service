'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const glyphsRouter = require('./routes/glyphs');
const codepointsRouter = require('./routes/codepoints');
const authRouter = require('./routes/auth');

const app = express();
const localBravuraDir = path.join(
  __dirname,
  'assets/bravura'
);

app.use('/glyph-fonts', express.static(localBravuraDir));

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

// Minimal request logging
app.use((req, _res, next) => {
  process.stdout.write(`${new Date().toISOString()} ${req.method} ${req.url}\n`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/', glyphsRouter);
app.use('/cp', codepointsRouter);
app.use('/auth', authRouter);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ewkwa-smufl-service' });
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
