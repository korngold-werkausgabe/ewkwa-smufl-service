'use strict';

/**
 * GlyphService – loads and indexes glyph records from data/glyphs.json.
 *
 * Input records follow this shape:
 * {
 *   charName: string
 *   desc: string
 *   codepoints: { smufl: string, schott?: string }
 *   classes?: string[]
 *   graphic?: string
 * }
 *
 * This service normalizes records to a stable internal shape.
 */

const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '../../data/glyphs.json');

let byName = null;
let byCodepoint = null;

function normalizeGlyph(record) {
  const codepoint = String(record.codepoints?.smufl || '').toUpperCase();
  const alt = String(record.codepoints?.schott || '').toUpperCase();
  const graphic = record.graphic || `${record.charName}.png`;
  const iiifImage = graphic.replace(/\.png$/i, '');

  return {
    name: record.charName,
    description: record.desc || record.charName,
    codepoint,
    alternateCodepoint: alt && alt !== codepoint ? alt : null,
    classes: Array.isArray(record.classes) ? record.classes : [],
    iiifImage,
  };
}

function load() {
  if (byName) return; // already loaded

  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const glyphs = JSON.parse(raw);

  byName = new Map();
  byCodepoint = new Map();

  for (const rawGlyph of glyphs) {
    const g = normalizeGlyph(rawGlyph);
    if (!g.name || !g.codepoint) continue;

    byName.set(g.name, g);
    byCodepoint.set(g.codepoint.toUpperCase(), g);
    if (g.alternateCodepoint) {
      byCodepoint.set(g.alternateCodepoint.toUpperCase(), g);
    }
  }
}

/**
 * Looks up a glyph by its SMuFL name (case-sensitive).
 * @param {string} name
 * @returns {object|null}
 */
function getByName(name) {
  load();
  return byName.get(name) ?? null;
}

/**
 * Looks up a glyph by its Unicode codepoint hex string (case-insensitive, no "U+" prefix).
 * @param {string} hex  e.g. "E0A4" or "e0a4"
 * @returns {object|null}
 */
function getByCodepoint(hex) {
  load();
  return byCodepoint.get(hex.toUpperCase()) ?? null;
}

module.exports = { getByName, getByCodepoint };
