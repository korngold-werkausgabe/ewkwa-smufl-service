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
let bySmuflCodepoint = null;
let allGlyphs = null;

function normalizeGlyph(record) {
  const codepoint = String(record.codepoints?.smufl || '').toUpperCase();
  const graphic = record.graphic || `${record.charName}.png`;
  const iiifImage = graphic.replace(/\.png$/i, '');

  return {
    name: record.charName,
    description: record.desc || record.charName,
    codepoints: record.codepoints || {},
    classes: Array.isArray(record.classes) ? record.classes : [],
    short: record.short || '',
    iiifImage,
  };
}

function load() {
  if (byName) return; // already loaded

  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const glyphs = JSON.parse(raw);

  byName = new Map();
  bySmuflCodepoint = new Map();

  for (const rawGlyph of glyphs) {
    const g = normalizeGlyph(rawGlyph);
    if (!g.name || !g.codepoints?.smufl) continue;

    byName.set(g.name, g);
    bySmuflCodepoint.set(g.codepoints.smufl.toUpperCase(), g);
  }
  allGlyphs = Array.from(byName.values());
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
function getBySmuflCodepoint(hex) {
  load();
  return bySmuflCodepoint.get(hex.toUpperCase()) ?? null;
}

/**
 * Looks up all glyphs.
 * @returns {object[]|null}
 */
function getAll(){
  load();
  return allGlyphs ?? null;
}

module.exports = { getByName, getBySmuflCodepoint, getAll };
