# 💸 FlowTracker — Personal Finance App

A PWA for tracking income and expenses, synced in real-time via Supabase.

---

## Project Structure

```
flowtracker/
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Offline support
│   └── icons/                 # App icons (add your own)
├── src/
│   ├── components/
│   │   ├── dashboard/         # SummaryCards, CategoryBreakdown, PeriodSelector
│   │   ├── transactions/      # TransactionForm, TransactionItem
│   │   ├── layout/            # BottomNav
│   │   └── ui/                # Toast, SyncIndicator, EmptyState
│   ├── hooks/
│   │   ├── useAuth.js         # Auth context + hook
│   │   ├── useTransactions.js # CRUD + realtime sync
│   │   └── useBudgets.js      # Budget CRUD
│   ├── lib/
│   │   ├── supabase.js        # Supabase client
│   │   ├── constants.js       # Categories, formatters
│   │   └── finance.js         # Computation utilities
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── Transactions.js
│   │   ├── Budgets.js
│   │   ├── Reports.js
│   │   ├── Settings.js
│   │   └── AuthPage.js
│   ├── styles/global.css
│   ├── App.js
│   └── index.js
├── .env.example
└── package.json
```

---

## 1. Prerequisites

- Node.js 18+ — https://nodejs.org
- A free Supabase account — https://supabase.com

---

## 2. Supabase Setup

### Create project
1. Go to https://supabase.com → New project
2. Choose a name (e.g. flowtracker) and set a database password
3. Wait ~2 minutes for provisioning

### Database schema
Go to **SQL Editor** in Supabase and run this:

```sql
-- Transactions table
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null,
  date        date not null,
  description text default '',
  nature      text not null default 'variable' check (nature in ('fixed', 'variable')),
  created_at  timestamptz default now()
);

-- Budgets table
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  amount_limit numeric(12, 2) not null check (amount_limit > 0),
  created_at   timestamptz default now(),
  unique(user_id, category)
);

-- Row Level Security: users only see their own data
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

create policy "transactions: own rows" on public.transactions
  for all using (auth.uid() = user_id);

create policy "budgets: own rows" on public.budgets
  for all using (auth.uid() = user_id);

-- Enable realtime for transactions
alter publication supabase_realtime add table public.transactions;
```

### Enable Email Auth
Go to **Authentication → Providers → Email** and make sure it is enabled.
Optionally turn off "Confirm email" for easier testing (under Auth → Settings).

### Get API credentials
Go to **Settings → API** and copy:
- Project URL
- anon / public key

---

## 3. Local Installation

```bash
# Clone or copy the project folder
cd flowtracker

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
```

Edit `.env.local`:
```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
# Start development server
npm start
```

Open http://localhost:3000 — create an account and start tracking.

---

## 4. Add App Icons

Place two PNG files in `public/icons/`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

You can generate them for free at https://favicon.io or use any image editor.

---

## 5. Deploy to Vercel (free, recommended)

```bash
# Build the app
npm run build

# Option A: Vercel CLI
npm i -g vercel
vercel --prod

# Option B: GitHub
# Push to GitHub → Import on https://vercel.com → Set env vars → Deploy
```

On Vercel, add your env vars under **Project → Settings → Environment Variables**:
```
REACT_APP_SUPABASE_URL     = https://...
REACT_APP_SUPABASE_ANON_KEY = eyJ...
```

Your app will be live at `https://your-app.vercel.app`.

---

## 6. Deploy to Netlify (alternative)

```bash
npm run build
# Drag the /build folder to https://app.netlify.com/drop
# Or connect GitHub repo and set env vars in Site Settings
```

---

## 7. Install on Phone (PWA)

Once deployed to a public URL:

**iPhone (Safari):**
1. Open the URL in Safari
2. Tap the Share button (square with arrow)
3. Scroll down → tap **Add to Home Screen**
4. Tap Add — done!

**Android (Chrome):**
1. Open the URL in Chrome
2. Tap the menu ⋮
3. Tap **Add to Home Screen**
4. Tap Add

**Desktop (Chrome/Edge):**
1. Look for the install icon in the address bar
2. Click it → Install

---

## 8. How Sync Works

- All data is stored in Supabase (PostgreSQL in the cloud)
- The app uses Supabase Realtime to subscribe to database changes
- Any device logged into the same account gets updates instantly
- Row Level Security ensures users only ever access their own data
- The service worker caches the app shell for offline loading
- Supabase is the single source of truth — no local-only data

---

## 9. How the PWA Works

- `manifest.json` tells the browser the app name, icon, and display mode
- `display: standalone` makes it open without browser chrome
- The service worker caches static assets for fast loads and offline support
- `viewport-fit=cover` + safe area insets handle iPhone notch properly
- `theme-color` matches the app background for a native feel

---

## Features

- Dashboard with daily / monthly / yearly views
- Add, edit, delete transactions
- Income & expense categories
- Fixed vs variable expense tracking
- Monthly budgets with overspend alerts
- Reports: month-on-month comparison, fixed/variable split, yearly overview
- Search and filter transactions
- Real-time cloud sync across all devices
- PWA: installable on iPhone, Android, and desktop
- Email/password authentication — data is private per account
