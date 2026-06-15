'use strict';

/**
 * Glyph endpoints:
 *   GET /:name.png   -> Image proxy
 *   GET /:name.xml   -> XML
 *   GET /:name.json  -> JSON
 *   GET /:name       -> XML (default)
 */

const { Router } = require('express');
const { getByName } = require('../services/glyphService');
const { glyphToTei } = require('../services/teiService');
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

function sendJson(req, res) {
  const glyph = resolveGlyph(req, res);
  if (!glyph) return;

  res.json(glyph);
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

router.get('/:name.png', requireKeycloakAuth, sendImage);
router.get('/:name.xml', sendXml);
router.get('/:name.json', sendJson);
router.get('/:name', sendXml);

module.exports = router;
