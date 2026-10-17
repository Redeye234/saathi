# Saathi — your everyday work companion

A responsive worker dashboard built with React, TypeScript and Vinext, deployable as a Cloudflare Worker through Sites.

## Features

- AI guidance, document explanation and grievance drafting via a server-side OpenAI Responses API integration.
- All 22 scheduled Indian languages plus English; additional language/dialect input. Localized navigation and greetings, with AI interface translation after connection. Translation quality, especially for low-resource languages, requires native-speaker evaluation before a public rollout.
- Browser voice input and read aloud when the device supports the selected language. Voice support is not guaranteed for every language.
- Income and expense tracking, India date boundaries, seven-day chart and CSV export.
- Official e-Shram and PM-SYM information, document readiness checklist, safety practices and rights guidance.
- Editable grievance drafts, text downloads and manually maintained draft/sent/resolved statuses.
- Google OAuth sign-in with HTTP-only sessions and D1-backed workspace sync for records, profile, language and drafts.

## Run locally

Requires Node 22.13+.

```sh
npm install
npm run dev
```

If the Windows npm shim is broken, invoke npm through its installed `node_modules/npm/bin/npm-cli.js` with Node.

Copy `.env.example` to `.dev.vars` and set `OPENAI_API_KEY`. The default model is `gpt-5-mini`; `OPENAI_MODEL` is configurable. For local Google OAuth, also set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI=http://localhost:8787/api/google/callback`. For Sites hosting, configure these as runtime environment secrets through Sites; never put credentials in browser code or commit them. Restart the server after changing local secrets.

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
- Public: `https://saathi-worker-companion.goofy-lemur-2466.chatgpt.site/api/google/callback`

Put the client ID and secret in local `.dev.vars` for local testing. In production, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (secret) and `GOOGLE_REDIRECT_URI` in the Sites runtime environment, then deploy a saved version so the new environment revision is applied. The app stores only a hash of its session cookie in D1.

## Data and boundaries

Earnings, profile, checklists and saved drafts use `localStorage` in the current browser. When a user signs in with Google, the same workspace snapshot is also stored in the site's D1 database and restored on the next sign-in. These records are not encrypted. Conversations and document passages remain in React memory and are not saved by the app. AI requests send the selected language, current message, up to eight prior messages, and relevant work type/state. OpenAI requests set `store: false`; provider retention is still governed by the provider's policies.

This app has no automatic complaint submission, government eligibility verification, emergency dispatch, medical diagnosis or location tracking. Users review and submit their own drafts. The e-Shram grievance link applies to e-Shram service issues, not all wage disputes.

Official source summaries live in `lib/knowledge.mjs`, reviewed 17 October 2026. The AI is instructed to ground specific scheme, safety and rights claims in those sources; this is curated context, not live retrieval. Review official rules before applying. Sources: [e-Shram FAQs](https://eshram.gov.in/faqs), [PM-SYM FAQs](https://labour.gov.in/FAQ-0), [112 ERSS](https://112.gov.in/). API reference: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text).

## Deployment and production considerations

The Sites manifest preserves the project identity and D1 binding in `.openai/hosting.json`; the current deployment is public and uses Google OAuth for user accounts. Add the Google runtime values before inviting users. The API validates requests, bounds message/history sizes, rejects cross-origin browser requests, hides provider errors and keeps API credentials server-side.

The automated tests exercise the real API handler with mocked provider responses, request validation, failure modes, grounding, role filtering, India dates, earnings arithmetic and CSV injection handling. A live model response requires a configured key and must be validated separately.
