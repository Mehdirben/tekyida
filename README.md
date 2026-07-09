# Tekyida — IOU Tracker 📒💰

A modern, mobile-first IOU (I Owe You) tracker built for tracking debts between friends, family, and colleagues. Manage multiple notebooks, log transactions in Moroccan Dirhams (MAD), and stay synced across devices.

> **Live:** Installable as a PWA on any device.

---

## ✨ Features

- **Multiple Notebooks** — Organize debts by context (personal, business, trips)
- **Contact Management** — Add contacts with optional phone numbers per notebook
- **Transaction Tracking** — Log who owes whom, how much, and why
- **Real-time Sync** — All data syncs instantly via Convex
- **Offline-First** — Full offline support with IndexedDB-backed mutation queue and query cache
- **Optimistic Updates** — All changes appear instantly in the UI, even offline
- **Sync Indicators** — Per-item unsynced icons (☁✕) and global sync status badge
- **Bilingual** — Full French / English support with one-click toggle
- **Dark / Light Mode** — Automatic system detection + manual toggle (iOS status bar aware)
- **PWA Ready** — Install on mobile for native-like experience with offline support
- **Secure Auth** — Email & password authentication via Convex Auth

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI** | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| **Backend** | [Convex](https://convex.dev/) (real-time database + serverless functions) |
| **Auth** | [@convex-dev/auth](https://labs.convex.dev/auth) (email/password) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **PWA** | Service Worker + Web App Manifest + IndexedDB |
| **Design** | Liquid Glass aesthetic with mesh gradients and glassmorphism |
| **Offline** | IndexedDB mutation queue + query cache, optimistic updates |

---

## 📁 Project Structure

```
tekyida/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (fonts, meta, PWA, providers)
│   ├── page.tsx            # Landing page (redirects to /app in PWA mode)
│   ├── providers.tsx       # ConvexAuthNextjsProvider wrapper
│   ├── globals.css         # Design system (themes, glass effects, animations)
│   ├── login/page.tsx      # Login page
│   ├── register/page.tsx   # Registration page
│   └── app/                # Authenticated app section
│       ├── layout.tsx      # Auth guard + bottom nav layout
│       ├── page.tsx        # Dashboard (notebooks, stats, contacts, transactions)
│       └── settings/       # Settings page (account, theme, language, PWA install)
├── components/
│   ├── ui/                 # Reusable UI primitives (Button, Logo, Card, Badge, Toggles)
│   ├── app/                # App feature components
│   │   ├── BottomNav.tsx       # Floating pill navigation bar
│   │   ├── NotebookSwitcher.tsx# Notebook dropdown picker
│   │   ├── QuickStats.tsx      # Balance summary cards
│   │   ├── ContactList.tsx     # Contact list with add/delete + sync badges
│   │   ├── TransactionList.tsx # Transaction sheet with add/delete + sync badges
│   │   ├── SyncIndicator.tsx   # Global sync status icon (offline/pending/syncing)
│   │   └── CacheWarmer.tsx     # Pre-fetches all notebooks' data for offline access
│   └── landing/            # Landing page sections
│       ├── Header.tsx      # Navigation header
│       ├── HeroSection.tsx # Hero with floating cards
│       ├── FeaturesSection.tsx
│       ├── HowItWorksSection.tsx
│       ├── CTASection.tsx
│       └── Footer.tsx
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema (notebooks, contacts, transactions)
│   ├── auth.ts             # Auth setup (email/password provider)
│   ├── auth.config.ts      # Auth configuration
│   ├── notebooks.ts        # Notebook CRUD mutations & queries
│   ├── contacts.ts         # Contact CRUD mutations & queries
│   ├── transactions.ts     # Transaction CRUD mutations & queries
│   └── http.ts             # HTTP router for auth endpoints
├── contexts/               # React contexts
│   ├── ThemeContext.tsx     # Dark/light mode with iOS theme-color sync
│   ├── SyncContext.tsx      # Offline mutation queue, sync status, per-item pending tracking
│   └── AmountsVisibilityContext.tsx # Toggle balance visibility
├── lib/                    # Offline infrastructure
│   ├── offlineQueue.ts     # IndexedDB mutation queue (enqueue, flush, retry)
│   ├── queryCache.ts       # IndexedDB query result cache with reactive subscriptions
│   └── optimisticUpdates.ts# Applies mutations to cache for instant UI feedback
├── hooks/
│   └── useCachedQuery.ts   # Drop-in useQuery replacement with offline cache + reactivity
├── i18n/                   # Internationalization
│   ├── en.ts               # English translations
│   ├── fr.ts               # French translations
│   └── LanguageContext.tsx  # React context + useTranslation hook
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # PWA icons (192px, 512px)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A free [Convex](https://convex.dev/) account

### 1. Clone & Install

```bash
git clone https://github.com/your-username/tekyida.git
cd tekyida
npm install
```

### 2. Set Up Convex

```bash
npx convex dev
```

This will:

- Prompt you to log in to Convex (creates an account if needed)
- Create a new project and development deployment
- Auto-generate a `.env.local` file with your Convex credentials
- Start watching for backend changes

### 3. Start Development Server

In a separate terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 4. Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `CONVEX_DEPLOYMENT` | Your Convex deployment identifier (set by `npx convex dev`) |
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex cloud endpoint URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Your Convex site endpoint (for auth callbacks) |
| `AUTH_RESEND_KEY` | Convex backend env var for Resend auth emails; set with `npx convex env set`, not in frontend hosting |
| `AUTH_EMAIL_FROM` | Convex backend env var for the verified Resend sender, for example `Tekyida <auth@yourdomain.com>` |

> The Convex URL variables are automatically configured when you run `npx convex dev` for the first time. The Resend variables are backend secrets and must be set on the Convex deployment with `npx convex env set`.

---

## 🐳 Docker Deployment

The Docker image runs only the Next.js frontend. Convex remains a separate Cloud or self-hosted backend.

Create the Compose environment file (it is ignored by Git):

```bash
cp .env.example .env
```

Set the public URLs in `.env` to the target Convex deployment, then build and start the app:

```bash
docker compose up -d --build
docker compose ps
```

The frontend is available at [http://localhost:3000](http://localhost:3000). Set `APP_PORT` in `.env` to publish another host port. View logs or stop it with:

```bash
docker compose logs -f app
docker compose down
```

`NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` are build arguments because Next.js embeds public variables in the browser bundle. Rebuild the image whenever either URL changes. Never pass `CONVEX_SELF_HOSTED_ADMIN_KEY`, JWT keys, or other backend secrets into this frontend image.

For Dokploy, deploy this repository with the `Dockerfile` and expose container port `3000`. In **Environment → Build Time Arguments**, add:

```env
NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com
```

Also add the same variables to the normal runtime environment for consistency. Dokploy's normal environment and **Build Time Arguments** are separate fields; setting only the normal environment makes the Docker build fail. Save the settings and redeploy. The platform can terminate HTTPS and route the public domain to the container. The detailed Cloud-to-self-hosted data procedure is in [migration_guide.md](migration_guide.md).

To build without Compose:

```bash
docker build \
  --build-arg NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com \
  --build-arg NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com \
  -t tekyida:latest .
docker run -d --name tekyida --restart unless-stopped -p 3000:3000 tekyida:latest
```

---

## 🏗 Production Deployment

### 1. Deploy Convex Backend

```bash
npx convex deploy
```

### 2. Set Auth Environment Variables (Production)

`@convex-dev/auth` requires three environment variables on your **production** Convex deployment. These are auto-set in dev mode but must be configured manually for production:

```bash
# Set your production frontend URL
npx convex env set SITE_URL https://your-app.vercel.app --prod

# Copy the JWKS from your dev deployment
npx convex env set JWKS '{"keys":[...]}' --prod

# Copy the JWT private key from your dev deployment
npx convex env set --prod JWT_PRIVATE_KEY -- '-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----'

# Resend email delivery for verification and password reset
npx convex env set AUTH_RESEND_KEY re_your_resend_api_key --prod
npx convex env set AUTH_EMAIL_FROM 'Tekyida <auth@yourdomain.com>' --prod
```

> **Tip:** Run `npx convex env list` to see your dev environment variables, then copy `JWKS` and `JWT_PRIVATE_KEY` to production.

You can verify production env vars with:

```bash
npx convex env list --prod
```

### 3. Deploy Frontend (Vercel)

Set these environment variables in your Vercel dashboard:

| Variable | Value |
| --- | --- |
| `CONVEX_DEPLOYMENT` | `prod:your-deployment-name` |
| `NEXT_PUBLIC_CONVEX_URL` | `https://your-deployment.convex.cloud` |

Then deploy:

```bash
npx vercel --prod
```

Or connect your GitHub repo to [Vercel](https://vercel.com/) for automatic deployments.

---

## 📱 PWA Installation

Tekyida is a Progressive Web App. Users can install it from:

- **Chrome/Edge**: Click the install icon in the address bar, or use the install button in Settings
- **Safari/iOS**: Share → Add to Home Screen
- **Settings page**: An "Install App" button appears when the browser supports installation

---

## 🌐 Internationalization

The app supports **English** and **French** with full coverage across all pages. Translations are defined in `i18n/en.ts` and `i18n/fr.ts`. The language toggle persists via `localStorage`.

---

## 🎨 Design System

Tekyida uses a custom **Liquid Glass** design system built with Tailwind CSS v4:

- **Mesh gradient backgrounds** with GPU-optimized animations
- **Glassmorphic cards and inputs** (`liquid-glass`, `liquid-glass-card`, `glass-input`)
- **Gradient text** accents
- **Smooth micro-animations** (slide-up, fade-in, scale-in)
- **CSS custom properties** for seamless dark/light mode theming

---

<p align="center">
  Made with ❤️ in Morocco 🇲🇦
</p>
