# CalApp - Calorie Tracking PWA

## Quick Reference

```bash
npm run dev    # Start Next.js dev server (port 3000)
npm run build  # Production build
npm run start  # Start production server
```

## Project Structure

```
calapp/
├── app/
│   ├── layout.tsx              # Root: <html>, ThemeRegistry, AuthProvider
│   ├── ThemeRegistry.tsx       # MUI Emotion cache for App Router
│   ├── manifest.ts             # PWA manifest
│   ├── login/
│   │   └── page.tsx            # Google sign-in
│   ├── (app)/                  # Authenticated route group
│   │   ├── layout.tsx          # Auth guard + FabProvider + Layout shell
│   │   ├── page.tsx            # Dashboard
│   │   ├── log/page.tsx        # FoodLog
│   │   ├── foods/page.tsx      # Foods
│   │   └── reports/page.tsx    # Reports
│   └── api/
│       ├── health/route.ts
│       ├── foods/route.ts              # GET, POST
│       ├── foods/[id]/route.ts         # GET, PUT, DELETE
│       ├── logs/route.ts               # GET, POST
│       ├── logs/[id]/route.ts          # PUT, DELETE
│       ├── reports/daily/route.ts
│       ├── reports/weekly/route.ts
│       ├── reports/monthly/route.ts
│       ├── settings/route.ts           # GET
│       └── settings/[key]/route.ts     # PUT
├── components/                 # Layout, AddFoodDialog, FoodLogEntry, BarcodeScannerModal
├── context/                    # AuthContext, FabContext
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client (NEXT_PUBLIC_ vars)
│   │   └── server.ts           # Server Supabase client
│   ├── auth.ts                 # validateAuth() for API routes
│   ├── reports.ts              # computeTotals(), zeroTotals()
│   └── foods.ts                # getFoodWithServingSizes()
├── services/api.ts             # Frontend fetch wrapper with auth token
├── types/index.ts              # Unified types
├── utils/openFoodFacts.ts      # Barcode lookup
├── public/                     # favicon.svg, icons
├── middleware.ts               # Security headers
├── next.config.ts              # PWA plugin
└── package.json
```

## Tech Stack

- **Framework**: Next.js 15 (App Router), TypeScript
- **UI**: React 19, Material UI 6, recharts
- **Auth & DB**: Supabase (PostgreSQL + Auth with Google OAuth)
- **PWA**: @ducanh2912/next-pwa (workbox, service worker)

## Architecture Notes

- Google OAuth via Supabase Auth; JWT validated server-side in API routes
- Supabase PostgreSQL database (schema in `supabase-schema.sql` — keep a copy for reference)
- All pages are `'use client'` components (stateful with hooks)
- API routes use `validateAuth()` from `lib/auth.ts` to verify Bearer tokens
- All nutrient columns in the `foods` table are nullable
- Food log entries reference foods via `food_id` FK with CASCADE delete
- Reports endpoints fill in zero-value days for missing dates
- MUI Grid: use `Grid2` import (`@mui/material/Grid2`), not the deprecated `Grid`

## Database Schema

Four tables: `foods`, `serving_sizes`, `food_logs`, `settings`. Key points:
- `food_logs.meal_type` is constrained to: breakfast, lunch, dinner, snack
- `food_logs.quantity` is a REAL multiplier (default 1)
- `food_logs.date` uses YYYY-MM-DD format
- `serving_sizes` linked to foods via `food_id` FK with CASCADE delete

## Code Conventions

- All modules use ESNext (Next.js bundler resolution)
- Path aliases: `@/*` maps to root (e.g., `@/types`, `@/lib/auth`)
- API client in `services/api.ts` — all endpoints go through the `request<T>()` helper
- MUI components are imported from individual paths (e.g., `@mui/material/Button`)
- No test framework is set up yet
