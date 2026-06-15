'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');

let jwks = null;

function normalizeBaseUrl(url) {
  return (url || '').replace(/\/$/, '');
}

function getIssuer() {
  const base = normalizeBaseUrl(process.env.KEYCLOAK_BASE_URL);
  const realm = process.env.KEYCLOAK_REALM || '';
  return `${base}/realms/${realm}`;
}

function getJwks() {
  if (jwks) return jwks;

  const issuer = getIssuer();
  const jwksUri = process.env.KEYCLOAK_JWKS_URI || `${issuer}/protocol/openid-connect/certs`;
  jwks = createRemoteJWKSet(new URL(jwksUri));
  return jwks;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;

  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const name = p.slice(0, idx).trim();
    const value = p.slice(idx + 1).trim();
    out[name] = decodeURIComponent(value);
  }
  return out;
}

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  if (/^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim();
  }

  // Compatible with Edirom keycloak-handler (stores keycloak_token cookie).
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.keycloak_token) {
    return cookies.keycloak_token;
  }

  return null;
}

function isKeycloakEnabled() {
  return String(process.env.KEYCLOAK_ENABLED || 'false').toLowerCase() === 'true';
}

function hasKeycloakConfig() {
  return !!(process.env.KEYCLOAK_BASE_URL && process.env.KEYCLOAK_REALM && process.env.KEYCLOAK_CLIENT_ID);
}

function buildJwtVerifyOptions() {
  return {
    issuer: getIssuer(),
    audience: process.env.KEYCLOAK_CLIENT_ID,
  };
}

async function verifyToken(token) {
  const options = buildJwtVerifyOptions();
  const result = await jwtVerify(token, getJwks(), options);
  return result.payload;
}

async function requireKeycloakAuth(req, res, next) {
  if (!isKeycloakEnabled()) {
    return next();
  }

  if (!hasKeycloakConfig()) {
    return res.status(503).json({
      error: 'Keycloak auth is enabled but not fully configured',
    });
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      error: 'Missing bearer token',
      hint: 'Send Authorization: Bearer <token> or keycloak_token cookie',
    });
  }

  try {
    const payload = await verifyToken(token);
    req.auth = { tokenPayload: payload };
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid token',
      detail: err.code || err.message,
    });
  }
}

module.exports = {
  requireKeycloakAuth,
  isKeycloakEnabled,
};
