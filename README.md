# Saathi — your everyday work companion

A responsive worker dashboard built with React, TypeScript and Vinext, deployable as a Cloudflare Worker through Sites.

## Project layout

- `frontend/` contains the React UI, its components and hooks, styles, and page implementation.
- `backend/` contains the optional Python FastAPI service.
- `app/` contains the Next/Vinext route entrypoints and the existing `/api/*` handlers used by the Cloudflare deployment. The page and layout files here are small framework entrypoints that connect to `frontend/`.
- `lib/` and `db/` contain shared application and Cloudflare API code; `public/` remains at the repository root because the current Next/Vinext build serves it from there.

## Features

- AI guidance, document explanation and grievance drafting via a server-side OpenAI Responses API integration.
- All 22 scheduled Indian languages plus English; additional language/dialect input. Localized navigation and greetings, with AI interface translation after connection. Translation quality, especially for low-resource languages, requires native-speaker evaluation before a public rollout.
- Browser voice input and read aloud when the device supports the selected language. Voice support is not guaranteed for every language.
- Income and expense tracking, India date boundaries, seven-day chart and CSV export.
- Official e-Shram and PM-SYM information, document readiness checklist, safety practices and rights guidance.
- Editable grievance drafts, text downloads and manually maintained draft/sent/resolved statuses.
- Google OAuth sign-in with HTTP-only sessions and D1-backed workspace sync for records, profile, language and drafts.

## Run locally

Requires Node 22.13+ and Python 3.12+. Install the frontend dependencies from the repository root with `npm install`.

## Python API backend

The browser interface is React. A FastAPI service in `backend/` can serve the same `/api/*` contract for sign-in, Google OAuth, workspace sync, AI and voice. Point the frontend at it with the public build variable `NEXT_PUBLIC_SAATHI_API_URL`; leave it unset to use the existing Cloudflare handlers.

Local configuration files are provided as `backend/.env` and root `.env.local` (both ignored by Git). The frontend points to FastAPI at `http://localhost:8000`; set `OPENAI_API_KEY` and Google OAuth values in `backend/.env` when those features are needed. If setting up another checkout, copy `backend/.env.example` to `backend/.env` and `.env.local.example` to `.env.local`.

Start the API in one PowerShell terminal:
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn saathi_api.main:app --reload --port 8000
```

In a second PowerShell terminal, from the repository root, run `npm install` once and then `npm run dev` to start React/Vinext on port 5173. `.env.local` directs browser API calls to FastAPI. The Python API defaults to a local SQLite database. For a hosted service, set a managed PostgreSQL `DATABASE_URL`, set `ENVIRONMENT=production`, use a stable HTTPS frontend origin in `FRONTEND_ORIGINS`, and provide secrets through the host's secret manager. Build from `backend/` with `docker build -f Dockerfile .`.

When using Google sign-in with FastAPI, register the backend callback URL (local default: `http://localhost:8000/api/google/callback`) in Google Cloud and set `GOOGLE_REDIRECT_URI` to that exact URL. The Python OAuth flow validates the one-time state and PKCE verifier before creating a session. Run `alembic upgrade head` as a release step before starting new API instances; do not make every replica race to migrate the production database.

For production, serve the frontend and API under the same site (for example `app.example.com` and `api.example.com`) so browsers accept the HTTP-only session cookie reliably. Set `COOKIE_DOMAIN=.example.com`, `COOKIE_SECURE=true`, and keep `COOKIE_SAMESITE=lax`; configure the exact frontend origin, without a wildcard. Browsers often block cookies when an API on an unrelated domain is embedded as a third party. The in-process request limiter protects a single service process; use a shared gateway or Redis-backed limiter before running multiple API replicas. Apply TLS at the host and keep API keys out of frontend build variables.

The Python database is separate from Cloudflare D1. Before switching a live frontend, prepare a private JSON export with `local_users`, `auth_sessions` and `worker_workspaces` arrays using the existing D1 column names, then run `python -m scripts.import_d1_export migration-export.json` from `backend/` after applying the Alembic migration. The importer validates workspace records, skips the known shared demo account, leaves existing records alone, and does not copy sessions; everyone signs in again. Legacy salted PBKDF2 passwords are verified and upgraded to scrypt at the next successful login. Keep the export private and delete it after migration. The demo account has been removed because its shared public credentials could expose workers' saved information.

Copy `.env.example` to `.dev.vars` and set `OPENAI_API_KEY`. The default model is `gpt-5-mini`; `OPENAI_MODEL` is configurable. For local Google OAuth, also set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI=http://localhost:8787/api/google/callback`. For a separately hosted frontend, configure these as runtime secrets at its host; never put credentials in browser code or commit them. Restart the server after changing local secrets.

Without a key, the app explicitly reports that AI is not connected. Earnings, checklists, official resources and the English grievance template work independently. No canned response is presented as generated AI. The health endpoint reports configuration presence, not provider availability.

```sh
node --test tests/assistant.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run db:generate
npm run build
```

## Google OAuth setup

Create a Google Cloud OAuth client of type **Web application**. Add these authorized redirect URIs:

- Local: `http://localhost:8787/api/google/callback`
For a separately deployed Cloudflare frontend, add its callback URL only while that deployment is in use. For FastAPI hosting, register the backend callback URL shown above. Put credentials in the relevant host's secret manager, not in browser code or source control.

## Data and boundaries

Earnings, profile, checklists and saved drafts use `localStorage` in the current browser. When a user signs in with Google, the same workspace snapshot is also stored in the site's D1 database and restored on the next sign-in. These records are not encrypted. Conversations and document passages remain in React memory and are not saved by the app. AI requests send the selected language, current message, up to eight prior messages, and relevant work type/state. OpenAI requests set `store: false`; provider retention is still governed by the provider's policies.

This app has no automatic complaint submission, government eligibility verification, emergency dispatch, medical diagnosis or location tracking. Users review and submit their own drafts. The e-Shram grievance link applies to e-Shram service issues, not all wage disputes.

Official source summaries live in `lib/knowledge.mjs`, reviewed 17 October 2026. The AI is instructed to ground specific scheme, safety and rights claims in those sources; this is curated context, not live retrieval. Review official rules before applying. Sources: [e-Shram FAQs](https://eshram.gov.in/faqs), [PM-SYM FAQs](https://labour.gov.in/FAQ-0), [112 ERSS](https://112.gov.in/). API reference: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text).

## Deployment and production considerations

The existing Sites deployment was changed to owner-only access on 17 October 2026. Its deployment URL still exists but is not publicly accessible. Sites controls available in this workflow do not expose an unpublish/delete operation, so this access change does not confirm that the hosting runtime or any associated charges have stopped. `.openai/hosting.json` preserves the project identity and D1 binding; keep it if you may manage the existing Site later. The repository also includes a separate FastAPI backend; it needs its own host and PostgreSQL database before production use.

The automated tests exercise the real API handler with mocked provider responses, request validation, failure modes, grounding, role filtering, India dates, earnings arithmetic and CSV injection handling. A live model response requires a configured key and must be validated separately.
