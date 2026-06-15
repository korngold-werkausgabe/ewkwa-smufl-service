'use strict';

const { Router } = require('express');
const { requireKeycloakAuth, isKeycloakEnabled } = require('../middleware/keycloakAuth');

const router = Router();

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getAuthBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

router.get('/silent-check-sso.html', (_req, res) => {
  const html = `<!doctype html>
<html>
<body>
  <script>
    parent.postMessage(location.href, location.origin);
  </script>
</body>
</html>`;

  res.type('text/html; charset=utf-8').send(html);
});

router.get('/login', (req, res) => {
  const keycloakUrl = process.env.KEYCLOAK_BASE_URL || '';
  const realm = process.env.KEYCLOAK_REALM || '';
  const clientId = process.env.KEYCLOAK_CLIENT_ID || '';
  const handlerScript = process.env.KEYCLOAK_HANDLER_SCRIPT_URL
    || 'https://cdn.jsdelivr.net/npm/@edirom/keycloak-handler@latest/keycloak-handler.js';

  const baseUrl = getAuthBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/silent-check-sso.html`;

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <title>ewkwa Keycloak Login</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; margin: 2rem; line-height: 1.4; }
    .hint { color: #444; max-width: 70ch; }
    .box { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Keycloak Login</h1>
  <p class="hint">Diese Seite bindet Ediroms keycloak-handler ein. Nach erfolgreichem Login wird ein Cookie keycloak_token gesetzt, das von diesem Service akzeptiert wird.</p>

  <div class="box">
    <keycloak-handler
      url="${escapeAttr(keycloakUrl)}"
      realm="${escapeAttr(realm)}"
      client-id="${escapeAttr(clientId)}"
      redirect-uri="${escapeAttr(redirectUri)}">
    </keycloak-handler>
  </div>

  <p class="hint">Pruefen: /auth/status oder direkt ein geschuetztes Bild unter /glyphs/:name.png abrufen.</p>

  <script type="module" src="${escapeAttr(handlerScript)}"></script>
</body>
</html>`;

  res.type('text/html; charset=utf-8').send(html);
});

router.get('/status', requireKeycloakAuth, (req, res) => {
  res.json({
    keycloakEnabled: isKeycloakEnabled(),
    authenticated: true,
    subject: req.auth?.tokenPayload?.sub || null,
    preferredUsername: req.auth?.tokenPayload?.preferred_username || null,
    issuer: req.auth?.tokenPayload?.iss || null,
    audience: req.auth?.tokenPayload?.aud || null,
  });
});

module.exports = router;
