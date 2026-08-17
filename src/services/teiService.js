"use strict";

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

const { create } = require("xmlbuilder2");

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
  const server = (process.env.IIIF_SERVER_URL || "").replace(/\/$/, "");
  const prefix = (process.env.IIIF_IMAGE_PREFIX || "").replace(/\/$/, "");
  const id = encodeURIComponent(iiifIdentifier);
  const prefixSegment = prefix ? `/${prefix}` : "";
  // Full image, max size, default rotation, color, PNG
  return `${server}${prefixSegment}/${id}/full/max/0/default.png`;
}

/**
 * Returns a TEI P5 XML string for the given glyph object.
 *
 * @param {object}  glyph
 * @returns {string}  UTF-8 XML string
 */
function glyphToTei(glyph) {
  if (!glyph || typeof glyph !== "object") {
    throw new Error("Invalid glyph object: must be an object");
  }
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("char", {
    xmlns: "http://www.tei-c.org/ns/1.0",
    "xml:id": `_${glyph.name}`,
  });

  root.ele("charName").txt(glyph.name).up();
  root
    .ele("desc")
    .txt(glyph.description || "No description")
    .up();

  Object.entries(glyph.codepoints).forEach(([key, value]) => {
      let htmlEntity;
    root.ele("mapping", { type: key }).txt(value.toUpperCase()).up();
  });

  root.ele("graphic").txt(`${glyph.name}.png`).up();

  const list = root.ele("note").ele("list").ele("head").txt("Classes").up();

  (glyph.classes || []).forEach((className) => {
    list.ele("item").txt(className).up();
  });

  if (!glyph.classes || glyph.classes.length === 0) {
    list.ele("item").txt("uncategorized").up();
  }

  if (glyph.short){
    root
    .ele("note", {type: 'shortNotation'})
    .txt(glyph.short)
    .up();
  }

  return root.end({ prettyPrint: true, headless: true });
}

function allGlyphsToTei(glyphs) {
  const root = create({ version: "1.0", encoding: "UTF-8" });
  const glyphsElement = root.ele("glyphs", {
    xmlns: "http://www.tei-c.org/ns/1.0",
  });

  glyphs.forEach((glyph) => {
    glyphsElement.ele(glyphToTei(glyph));
  });

  return root.end({ prettyPrint: true });
}

module.exports = { glyphToTei, allGlyphsToTei };
