'use strict';

/**
 * Codepoint endpoints:
 *   GET /:hex.xml  -> XML
 *   GET /:hex.png  -> Image proxy
 *   GET /:hex      -> XML (default)
 *
 * The hex segment must be 4–5 uppercase or lowercase hex digits (no "U+" prefix).
 *
 * Examples:
 *   GET /cp/E0A4.xml   → noteheadBlack XML
 *   GET /cp/E0A4.png   → noteheadBlack image
 *   GET /cp/E0A4       → noteheadBlack XML (default)
 */

const { Router } = require('express');
const { getByCodepoint } = require('../services/glyphService');
const { glyphToTei } = require('../services/teiService');
const { proxyImage } = require('../services/iiifProxy');
const { requireKeycloakAuth } = require('../middleware/keycloakAuth');

const router = Router();

function validateCodepoint(hex) {
  return /^[0-9A-Fa-f]{4,5}$/.test(hex);
}

function resolveGlyph(req, res) {
  const hex = String(req.params.hex || '').replace(/\.png$/i, '');

  if (!validateCodepoint(hex)) {
    res.status(400).json({ error: 'Invalid codepoint – expected 4–5 hex digits' });
    return null;
  }

  const glyph = getByCodepoint(hex);
  if (!glyph) {
    res.status(404).json({ error: `No glyph found for codepoint U+${hex.toUpperCase()}` });
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

router.get('/:hex.png', requireKeycloakAuth, sendImage);
router.get('/:hex.xml', sendXml);
router.get('/:hex', sendXml);

module.exports = router;
