# Leads & Business Contacts — React Frontend

Production-ready React app for Google Sheets–backed lead management. It searches via a webhook (n8n), visualizes your sheet, highlights duplicates, and lets you remove duplicates on the sheet with a single click.

## Features

- Auth against a `USER` sheet tab (email/password).
- Search via webhook with payload `{ query, email }` and render leads + sheet data.
- Auto-normalization of sheet rows; smart default sorting and optional column sorting.
- Duplicate detection entirely client-side; remove duplicates via webhook with row numbers.
- Loading overlay, inline spinners, snackbars for user feedback.
- Keyword column support: unique dropdown filter + colored chips per keyword.
- Stats header: Search Limit, Current Access, Total Query, Generated Data, Delete Item.
- Empty-state card with a small animation when there’s no data.
- Dev proxy for CORS-free local development.

## Tech stack

- React 18 (Create React App)
- Axios
- Tailwind (optional utilities), custom CSS

## Folder structure

```
.
├─ public/
│  └─ index.html
├─ src/
│  ├─ App.jsx
│  ├─ index.jsx
│  ├─ styles.css
│  ├─ setupProxy.js              # CRA dev proxy to avoid CORS in dev
│  ├─ components/
│  │  ├─ AnimatedBackground.jsx
│  │  ├─ EmptyState.jsx          # animated empty-card when no rows
│  │  ├─ Login.jsx
│  │  ├─ SheetTable.jsx          # table + filters + keyword chips
│  │  └─ Snackbar.jsx
│  ├─ controllers/
│  │  ├─ appController.js        # main app state/effects/actions
│  │  ├─ authController.js       # login + local persistence + refresh
│  │  └─ searchController.js     # webhook search + row normalization
│  ├─ models/
│  │  ├─ leadModel.js            # normalizeRow, parse CSV, dedupeRows
│  │  └─ userModel.js            # email, limits, totalQuery, generateDataCount
│  ├─ services/
│  │  └─ apiService.js           # axios helpers + Google Sheets CSV fetch
│  └─ utils/
│     └─ csvExport.js
├─ n8n/
│  └─ lead_generation_workflow.json
├─ .env.example                  # copy to .env / .env.local and fill in
├─ package.json
└─ README.md
```

## Environment variables

Set these in `.env` (or `.env.local`). We committed `.env.example` as a template and ignore real `.env*` files.

```
REACT_APP_WEBHOOK_URL=              # e.g. https://demo.example.com/webhook-test/lead_generation
REACT_APP_SHEET_ID=                 # Google Sheet ID
REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL=  # e.g. https://demo.example.com/webhook-test/remove_duplicates
REACT_APP_AUTO_REFRESH_MS=0         # Optional; 0 disables periodic re-search
```

Important: CRA reads env vars at startup. Restart `npm start` after edits.

## Local development

```
npm install
npm start
```

### Dev proxy to avoid CORS

We proxy `/webhook-test/*` to `https://demo.example.com` in dev (`src/setupProxy.js`).

In `.env.development.local` you can point URLs to the proxy paths:

```
REACT_APP_WEBHOOK_URL=/webhook-test/lead_generation
REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL=/webhook-test/remove_duplicates
```

For production you should enable CORS on the webhook (see below) or serve the frontend from the same origin.

## Webhook contracts

### Search webhook (n8n/Apps Script)

Request (POST JSON):

```
{ "query": "hospital, Dhaka", "email": "user@example.com" }
```

Response (any of the following are supported):

```
{ "leads": [...], "sheetData": [...] }
{ "leads": [...], "sheetRows": [...] }
[ ... ]                              # interpreted as rows
"CSV text"                           # parsed into rows
```

### Remove duplicates webhook

We call this when the user chooses “Remove duplicates”. The app deduplicates locally and posts the duplicates with row numbers (2-based, header-aware):

```
{
	"sheetId": "...",
	"sheetName": "Sheet1",
	"duplicates": [
		{ "Name": "...", "formatted_phone_number": "...", "website": "...", "formatted_address": "...", "rowNumber": 5 }
	]
}
```

Expected response (example):

```
{ "message": "Successfully Remove Duplicate", "status": "success" }
```

On success we show the message, refresh the sheet, and display a final success toast. On failure we fall back to local removal (UI only) and show the error.

## Google Sheets access

Public sheet tab fetch uses the “gviz CSV” endpoint:

```
https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}
```

The `USER` tab is used for authentication and limits. We normalize headers to snake_case; supported fields include:

- `email`, `password`
- `sheet_name`
- `search_limit_access`
- `current_access`
- `total_query`
- `generate_data_count`

## Styling & UX

- Tailwind utilities are supported, with CSS fallbacks (e.g., `.text-center`).
- Loading overlay + inline spinner for search and remove operations.
- Snackbar component for brief messages.
- Keyword chips colored deterministically by value.
- Empty-state card with floating SVG animation.

## Scripts

```
npm start   # dev server
npm build   # production build
npm test    # CRA tests
```

## CORS in production

If you host the API on a different origin, ensure your webhook responds to the CORS preflight with at least:

```
Access-Control-Allow-Origin: https://your-frontend.example
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Security

- `.env*` files are ignored by Git. Use `.env.example` as a template.
- If any secrets were pushed previously, rotate them and scrub history (git-filter-repo/BFG).

## Development notes

- Restart `npm start` after changing `.env*`.
- Remove auto re-search unless you set `REACT_APP_AUTO_REFRESH_MS` > 0.

---

## Reuse this project — prompt template

Paste the following prompt into your AI assistant to scaffold a new project like this one:

```
Build a React (Create React App) frontend for a Google Sheets–backed lead manager with the following:

- Controllers pattern: appController (state/effects), searchController (webhook search, returns leads + rows), authController (login from a USER sheet, local persistence).
- Models: leadModel (normalizeRow, parse CSV to rows, dedupeRows that returns { deduped, duplicateCount, duplicates } with rowNumber 2-based), userModel (email, sheetName, searchLimit, currentAccess, totalQuery, generateDataCount).
- Services: apiService with axios helpers, postWebhook(url, payload), postDeleteDuplicates(url, payload), fetchSheetRows(sheetId, sheetName) via Google Sheets gviz CSV.
- UI: App.jsx with login, search input, stats (Search Limit, Current Access, Total Query, Generated Data, Delete Item), snackbar, loading overlay, and a SheetTable component.
- Table: SheetTable supports global filter, address filter, a unique sorted keyword dropdown, sortable columns, CSV export, and keyword chips with deterministic colors.
- Duplicates: Detect client-side; when removing, POST duplicates + rowNumber to a webhook; show webhook message, refresh sheet, final toast; fallback to local removal on error.
- CORS-friendly dev: setupProxy.js to proxy /webhook-test/* to a remote base; provide .env.development.local mapping URLs to proxy paths.
- Empty state: Animated empty card when no data.
- Env: `.env.example` with REACT_APP_WEBHOOK_URL, REACT_APP_SHEET_ID, REACT_APP_REMOVE_DUPLICATES_WEBHOOK_URL, REACT_APP_AUTO_REFRESH_MS.
- README with setup, folder structure, webhook contracts, CORS notes.
```

Happy building!
