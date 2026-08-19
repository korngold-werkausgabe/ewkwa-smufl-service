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

function codepointToGlyph(codepoint) {
  const value = String(codepoint || '').replace(/^U\+/i, '').replace(/^0x/i, '');
  if (!/^[0-9A-Fa-f]{4,5}$/.test(value)) return '—';

  try {
    return String.fromCodePoint(parseInt(value, 16));
  } catch {
    return '—';
  }
}

function sendOverview(_req, res) {
  const glyphs = getAll();

  const rows = glyphs.map((glyph) => {
    const smuflValue = glyph.codepoints?.smufl || '—';
    const renderedGlyph = codepointToGlyph(smuflValue);
    const codepoints = Object.entries(glyph.codepoints || {})
      .map(([label, value]) => `${label}: ${value}`)
      .join('<br>');
    const classes = (glyph.classes || []).join(', ') || '—';
    const nameLink = `<a href="/${encodeURIComponent(glyph.name)}">${escapeHtml(glyph.name)}</a>`;

    return `
      <tr>
        <td>${nameLink}</td>
        <td class="glyph-cell"><span class="glyph-preview" title="${escapeHtml(smuflValue)}">${renderedGlyph}</span></td>
        <td class="glyph-code">${escapeHtml(smuflValue)}</td>
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
      @font-face {
        font-family: "Bravura";
        src: url("/glyph-fonts/Bravura.woff2") format("woff2"),
             url("/glyph-fonts/Bravura.woff") format("woff");
        font-display: swap;
      }

      * {
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }

      ::selection {
        background: transparent;
      }

      body { font-family: sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; max-width: 1400px; }
      th, td { border: 1px solid #d0d0d0; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      a { color: #0057b8; }
      .glyph-cell {
        width: 4rem;
        text-align: center;
      }
      .glyph-preview {
        display: inline-block;
        min-width: 2.5rem;
        font-family: "Bravura", "Segoe UI Symbol", sans-serif;
        font-size: 2.25rem;
        line-height: 1;
        color: #111;
      }
      .glyph-code {
        font-family: monospace;
        white-space: nowrap;
      }
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
          <th>Glyph</th>
          <th>Codepoint</th>
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
