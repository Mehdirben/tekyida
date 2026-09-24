# Frontend (`@tekyida/frontend`)

This package contains the Next.js web application for Tekyida.

## Structure

```text
frontend/
├── app/              # Next.js App Router pages and layouts
├── components/       # UI components & landing components
├── contexts/         # React Context providers (Auth, Sync, Theme, etc.)
├── hooks/            # Custom React hooks
├── i18n/             # Translations (en, fr)
├── lib/              # Client utilities, crypto, and offline queue
├── public/           # Static assets, icons, manifest, service worker
├── next.config.ts    # Next.js configuration
├── package.json
└── tsconfig.json
```

## Running Locally

From the repository root:
```bash
npm run dev:frontend
```

Or from within `frontend/`:
```bash
cd frontend
npm run dev
```

The web app will be available at `http://localhost:3000`.

## Building for Production

```bash
npm run build:frontend
```
