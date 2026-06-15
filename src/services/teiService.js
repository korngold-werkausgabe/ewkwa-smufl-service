'use strict';

/**
 * teiService – generates TEI P5 XML for a single SMuFL glyph.
 *
 * Structure mirrors the Edirom/SMuFL-Browser char-entry approach:
 *  <char xml:id="_name">
 *    <charName/>
 *    <desc/>
 *    <mapping type="smufl">U+XXXX</mapping>
 *    <graphic url=".../XXXX.png"/>
 *    <note><list><head>Classes</head><item>...</item></list></note>
 *  </char>
 */

const { create } = require('xmlbuilder2');

const TEI_GRAPHIC_BASE_URL = process.env.TEI_GRAPHIC_BASE_URL || 'https://smufl-browser.edirom.de';

/**
 * Builds a public IIIF Image API URL for a glyph.
 * The identifier segment uses the glyph's `iiifImage` field.
 *
 * Default region / size / rotation / quality / format follow IIIF Image API 3.
 *
 * @param {string} iiifIdentifier
 * @returns {string}
 */
function buildIiifUrl(iiifIdentifier) {
  const server = (process.env.IIIF_SERVER_URL || '').replace(/\/$/, '');
  const prefix = (process.env.IIIF_IMAGE_PREFIX || '').replace(/\/$/, '');
  const id = encodeURIComponent(iiifIdentifier);
  const prefixSegment = prefix ? `/${prefix}` : '';
  // Full image, max size, default rotation, color, PNG
  return `${server}${prefixSegment}/${id}/full/max/0/default.png`;
}

function buildTeiGraphicUrl(codepoint) {
  const base = TEI_GRAPHIC_BASE_URL.replace(/\/$/, '');
  return `${base}/${codepoint.toUpperCase()}.png`;
}

/**
 * Returns a TEI P5 XML string for the given glyph object.
 *
 * @param {object}  glyph
 * @returns {string}  UTF-8 XML string
 */
function glyphToTei(glyph) {
  const codepoint = glyph.codepoint.toUpperCase();
  const uPlusCodepoint = `U+${codepoint}`;
  const classes = Array.isArray(glyph.classes) ? glyph.classes : [];

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('char', {
      xmlns: 'http://www.tei-c.org/ns/1.0',
      'xml:id': `_${glyph.name}`,
    });

  root.ele('charName').txt(glyph.name).up();
  root.ele('desc').txt(glyph.description).up();
  root.ele('mapping', { type: 'smufl' }).txt(uPlusCodepoint).up();
  root.ele('graphic', { url: buildTeiGraphicUrl(codepoint) }).up();

  const list = root.ele('note')
    .ele('list')
      .ele('head').txt('Classes').up();

  for (const className of classes) {
    list.ele('item').txt(className).up();
  }

  if (classes.length === 0) {
    list.ele('item').txt('uncategorized').up();
  }

  list
  .up();

  return root.end({ prettyPrint: true });
}

module.exports = { glyphToTei, buildIiifUrl };
