'use strict';

/**
 * Glyph endpoints:
 *   GET /:name.png   -> Image proxy
 *   GET /:name.xml   -> XML
 *   GET /:name.json  -> JSON
 *   GET /:name       -> XML (default)
 */

const { Router } = require('express');
const { getByName, getAll } = require('../services/glyphService');
const { glyphToTei } = require('../services/teiService');
const { allGlyphsToTei } = require('../services/teiService');
const { proxyImage } = require('../services/iiifProxy');
const { requireKeycloakAuth } = require('../middleware/keycloakAuth');

const router = Router();

function validateName(name) {
  return /^[A-Za-z0-9._-]+$/.test(name);
}

function resolveGlyph(req, res) {
  const { name } = req.params;

  // Basic validation: SMuFL glyph names are ASCII alphanumeric + possible dots
  if (!validateName(name)) {
    res.status(400).json({ error: 'Invalid glyph name' });
    return null;
  }

  const glyph = getByName(name);
  if (!glyph) {
    res.status(404).json({ error: `Glyph "${name}" not found` });
    return null;
  }

  return glyph;
}

function sendXml(req, res) {
  const glyph = resolveGlyph(req, res);
  if (!glyph) return;

  const xml = glyphToTei(glyph);
  res.type('application/xml').send(xml);
}

function sendXmlAll(req, res) {
  const allGlyphs = getAll();
  const allGlyphsXml = allGlyphsToTei(allGlyphs);
  res.type('application/xml').send(allGlyphsXml);
}

function sendJson(req, res) {
  const glyph = resolveGlyph(req, res);
  if (!glyph) return;

  res.json(glyph);
}

function sendJsonAll(req, res) {
  const allGlyphs = getAll();
  res.json(allGlyphs);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sendOverview(_req, res) {
  const glyphs = getAll();

  const rows = glyphs.map((glyph) => {
    const codepoints = Object.entries(glyph.codepoints || {})
      .map(([label, value]) => `${label}: ${value}`)
      .join('<br>');
    const classes = (glyph.classes || []).join(', ') || '—';
    const nameLink = `<a href="/${encodeURIComponent(glyph.name)}">${escapeHtml(glyph.name)}</a>`;

    return `
      <tr>
        <td>${nameLink}</td>
        <td>${escapeHtml(glyph.description || '')}</td>
        <td>${codepoints ? codepoints : '—'}</td>
        <td>${escapeHtml(classes)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SMuFL Glyph Overview</title>
    <style>
      body { font-family: sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; max-width: 1200px; }
      th, td { border: 1px solid #d0d0d0; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      a { color: #0057b8; }
      code { font-family: monospace; }
    </style>
  </head>
  <body>
    <h1>SMuFL Glyph Overview</h1>
    <p>${glyphs.length} glyphs available.</p>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Codepoints</th>
          <th>Classes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;

  res.type('html').send(html);
}

async function sendImage(req, res, next) {
  const glyph = resolveGlyph(req, res);
  if (!glyph) return;

  if (!process.env.IIIF_SERVER_URL) {
    return res.status(503).json({ error: 'IIIF_SERVER_URL is not configured' });
  }

  try {
    await proxyImage(glyph.iiifImage, res);
  } catch (err) {
    next(err);
  }
}

router.get('/', sendOverview);
router.get('/xml', sendXmlAll);
router.get('/json', sendJsonAll);
router.get('/:name.png', requireKeycloakAuth, sendImage);
router.get('/:name.xml', sendXml);
router.get('/:name.json', sendJson);
router.get('/:name', sendXml);

module.exports = router;
