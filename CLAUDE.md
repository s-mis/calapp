# CalApp - Calorie Tracking PWA

## Quick Reference

```bash
npm run dev          # Start both backend (port 3001) and frontend (port 5173)
npm run dev:backend  # Backend only
npm run dev:frontend # Frontend only
npm run build        # Production build (frontend)
```

## Project Structure

```
calapp/
├── backend/           # Express + TypeScript + SQLite
│   └── src/
│       ├── index.ts   # Server entry, middleware, route mounting
│       ├── db.ts      # SQLite connection (better-sqlite3), schema init
│       ├── types.ts   # Shared TypeScript interfaces
│       └── routes/
│           ├── foods.ts    # GET/POST/PUT/DELETE /api/foods
│           ├── logs.ts     # GET/POST/PUT/DELETE /api/logs
│           └── reports.ts  # GET /api/reports/daily|weekly|monthly
├── frontend/          # React + TypeScript + Vite + MUI v6
│   └── src/
│       ├── main.tsx          # React root, providers
│       ├── App.tsx           # Router setup
│       ├── theme.ts          # MUI theme config
│       ├── services/api.ts   # All API calls (fetch-based)
│       ├── types/index.ts    # Frontend type definitions
│       ├── components/
│       │   ├── Layout.tsx         # AppBar + bottom navigation shell
│       │   ├── AddFoodDialog.tsx  # Food create/edit dialog
│       │   └── FoodLogEntry.tsx   # Single log entry card
│       └── pages/
│           ├── Dashboard.tsx  # Today's summary, macro cards, recent entries
│           ├── FoodLog.tsx    # Date-based log with meal grouping
│           ├── Foods.tsx      # Food CRUD with search
│           └── Reports.tsx    # Charts (recharts) - daily/weekly/monthly
└── package.json       # Root scripts using concurrently
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, better-sqlite3
- **Frontend**: React 19, TypeScript, Vite 6, Material UI 6, react-router-dom 7, recharts
- **PWA**: vite-plugin-pwa (workbox, manifest, service worker)
- **Dev tools**: tsx (backend dev runner), concurrently (parallel dev scripts)

## Architecture Notes

- Single-user app, no authentication
- SQLite database stored at `backend/calapp.db` (gitignored)
- Vite dev server proxies `/api` → `http://localhost:3001` (configured in `vite.config.ts`)
- All nutrient columns in the `foods` table are nullable — users fill in what they know
- Food log entries reference foods via `food_id` FK with CASCADE delete
- Reports endpoints fill in zero-value days for missing dates in weekly/monthly views
- MUI Grid: use `Grid2` import (`@mui/material/Grid2`), not the deprecated `Grid`

## Database Schema

Two tables: `foods` (nutritional data) and `food_logs` (daily entries). See `backend/src/db.ts` for full schema. Key points:
- `food_logs.meal_type` is constrained to: breakfast, lunch, dinner, snack
- `food_logs.servings` is a REAL multiplier (default 1)
- `food_logs.date` uses YYYY-MM-DD format

## Code Conventions

- Backend uses CommonJS module resolution (tsconfig `module: "commonjs"`)
- Frontend uses ESNext modules (Vite bundler resolution)
- API client in `frontend/src/services/api.ts` — all endpoints go through the `request<T>()` helper
- MUI components are imported from individual paths (e.g., `@mui/material/Button`, not `{ Button } from '@mui/material'`)
- No test framework is set up yet
