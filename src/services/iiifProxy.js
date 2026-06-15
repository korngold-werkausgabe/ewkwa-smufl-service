'use strict';

/**
 * iiifProxy – forwards authenticated requests to the private IIIF image server.
 *
 * Credentials (IIIF_AUTH_TOKEN or IIIF_BASIC_USER/IIIF_BASIC_PASS) are kept
 * server-side and never exposed to the browser. Proxy endpoints in glyphs.js and
 * codepoints.js perform their own Keycloak access control.
 */

const { buildIiifUrl } = require('./teiService');

/**
 * Fetches an image from the IIIF server and pipes it to the Express response.
 *
 * @param {string}   iiifIdentifier  – value of glyph.iiifImage
 * @param {object}   res             – Express response object
 */
async function proxyImage(iiifIdentifier, res) {
  // Dynamic import: node-fetch v3 is ESM-only
  const { default: fetch } = await import('node-fetch');

  const url = buildIiifUrl(iiifIdentifier);

  /** @type {Record<string,string>} */
  const headers = {};

  // Bearer-token auth (preferred)
  if (process.env.IIIF_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.IIIF_AUTH_TOKEN}`;
  } else if (process.env.IIIF_BASIC_USER && process.env.IIIF_BASIC_PASS) {
    // HTTP Basic auth fallback
    const credentials = Buffer.from(
      `${process.env.IIIF_BASIC_USER}:${process.env.IIIF_BASIC_PASS}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const upstream = await fetch(url, { headers });

  if (!upstream.ok) {
    res
      .status(upstream.status)
      .json({ error: `IIIF server returned ${upstream.status}` });
    return;
  }

  // Forward safe content-type header only
  const contentType = upstream.headers.get('content-type') || 'image/png';
  res.setHeader('Content-Type', contentType);

  // Stream body directly to the client – avoids buffering the full image
  upstream.body.pipe(res);
}

module.exports = { proxyImage };
