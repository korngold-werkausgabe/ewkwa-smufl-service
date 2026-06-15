# ewkwa-smufl-service

Lightweight Node/Express service for a custom SMuFL font.

The service provides TEI-based XML for glyph metadata and a protected image
proxy for glyph renderings stored on a private IIIF server.

## Endpoints

- `GET /:name` (XML by name, default)
- `GET /:name.xml` (XML by name)
- `GET /:name.json` (JSON by name)
- `GET /:name.png` (image proxy by name)
- `GET /cp/:hex` (XML by codepoint, default)
- `GET /cp/:hex.xml` (XML by codepoint)
- `GET /cp/:hex.png` (image proxy by codepoint)
- `GET /auth/login` (hosted Keycloak login page using Edirom keycloak-handler)
- `GET /auth/silent-check-sso.html` (silent SSO callback page)
- `GET /auth/status` (token check and claims preview)
- `GET /health`

## Authentication

The image proxy endpoints (`/:name.png` and `/cp/:hex.png`) support Keycloak-based authentication.

- If `KEYCLOAK_ENABLED=true`, image requests require a valid access token.
- Token sources:
  - `Authorization: Bearer <access-token>`
  - Cookie `keycloak_token` (compatible with `Edirom/edirom-keycloak-handler`)

### Browser integration

You can open `/auth/login` to use `Edirom/edirom-keycloak-handler` directly from
this service. After login, the handler stores `keycloak_token` in a cookie,
which is accepted by the backend auth middleware.

## Setup

1. Install dependencies:

	```bash
	npm install
	```

2. Configure environment:

	```bash
	cp .env.example .env
	```

3. Set at least:

	- `IIIF_SERVER_URL`
	- one IIIF upstream auth method:
	  - `IIIF_AUTH_TOKEN`, or
	  - `IIIF_BASIC_USER` + `IIIF_BASIC_PASS`

4. For Keycloak protection additionally set:

	- `KEYCLOAK_ENABLED=true`
	- `KEYCLOAK_BASE_URL`
	- `KEYCLOAK_REALM`
	- `KEYCLOAK_CLIENT_ID`
	- optional: `KEYCLOAK_HANDLER_SCRIPT_URL` (custom script URL for keycloak-handler)

5. Start service:

	```bash
	npm start
	```

## Notes on Edirom Integration

The XML shape follows the Edirom/SMuFL-Browser pattern:

- `<char>` entry with `<charName>`, `<desc>`, `<mapping type="smufl">` and `<graphic>`.
- `graphic/@url` is generated from the SMuFL codepoint (e.g. `.../E0A4.png`).

Example output pattern:

- `https://smufl-browser.edirom.de/accidentalFlatArabic.xml`
