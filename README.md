# Tekyida — IOU Tracker 📓💰

A modern, mobile-first IOU (I Owe You) tracker built for tracking debts between friends, family, and colleagues. Manage multiple notebooks, log transactions in Moroccan Dirhams (MAD), and stay synced across devices.

> **Architecture:** Clean multi-platform repository supporting Web, iOS, Android, Convex Backend, and Documentation.

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
- **PWA & Native Mobile** — Web PWA, Native iOS (SwiftUI), and Native Android (Jetpack Compose)
- **Secure Auth** — Email & password authentication via Convex Auth

---

## 📁 Repository Structure

The root directory contains only the dedicated platform and service folders:

```text
tekyida/
├── docs/                     # Specifications, migration guides, and architecture records
│   ├── architecture.md
│   ├── dokploy_guide.md
│   ├── migration_guide.md
│   └── README.md
│
├── frontend/                 # Next.js 16 Web Application (App Router, Tailwind CSS)
│   ├── app/                  # App Router pages and layouts
│   ├── components/           # UI components & features
│   ├── contexts/             # Theme, Sync, & Visibility contexts
│   ├── hooks/                # React hooks (offline cache, etc.)
│   ├── i18n/                 # Translation dictionaries (en, fr)
│   ├── lib/                  # Utilities & offline queue
│   ├── public/               # Static assets & PWA manifest
│   ├── scripts/              # Icon generation scripts
│   ├── Dockerfile            # Container build for web app
│   ├── compose.yaml          # Docker Compose service definition
│   ├── .env.example          # Frontend environment template
│   ├── .env.local            # Frontend local environment
│   ├── .gitignore            # Frontend ignore rules
│   ├── package.json          # Dependencies & scripts
│   └── tsconfig.json         # TypeScript configuration
│
├── backend/                  # Convex backend database & serverless functions
│   ├── convex/
│   │   ├── _generated/       # Convex client code & types
│   │   ├── schema.ts         # Database schema
│   │   ├── auth.ts           # Authentication logic
│   │   └── ...               # Queries & mutations
│   ├── .env.example          # Backend environment template
│   ├── .env.local            # Backend credentials
│   ├── .gitignore            # Backend ignore rules
│   ├── package.json          # Convex dependencies & scripts
│   └── README.md
│
├── ios/                      # Native iOS App (SwiftUI, XcodeGen)
│   ├── Sources/App/          # Swift source code & assets
│   ├── project.yml           # XcodeGen specification
│   ├── .env.example          # iOS environment template
│   ├── .gitignore            # Xcode ignore rules
│   └── README.md
│
├── android/                  # Native Android App (Kotlin, Jetpack Compose)
│   ├── app/                  # Application code, resources & build script
│   ├── build.gradle.kts      # Top-level build script
│   ├── settings.gradle.kts   # Project settings
│   ├── .env.example          # Android environment template
│   ├── .gitignore            # Android & Gradle ignore rules
│   └── README.md
│
├── .github/                  # GitHub Actions CI/CD workflows
├── .gitignore                # Root gitignore
└── README.md                 # Project README
```

---

## 🚀 Getting Started

### 1. Frontend Web App (`frontend/`)

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

To build with Docker:
```bash
cd frontend
docker compose up -d --build
```

### 2. Convex Backend (`backend/`)

```bash
cd backend
npm install
npx convex dev
```

### 3. iOS App (`ios/`)

```bash
cd ios
xcodegen generate
open Tekyida.xcodeproj
```

CI builds are automatically triggered on push to main via `.github/workflows/build.yml`.

### 4. Android App (`android/`)

1. Open `android/` directory in Android Studio.
2. Let Gradle sync dependencies.
3. Run on an emulator or Android device.

---

## 📚 Documentation

Detailed documentation is in [docs/](file:///home/mehdi/projects/tekyida/docs/):
- [Architecture Overview](file:///home/mehdi/projects/tekyida/docs/architecture.md)
- [Dokploy Deployment Guide](file:///home/mehdi/projects/tekyida/docs/dokploy_guide.md)
- [Migration Guide](file:///home/mehdi/projects/tekyida/docs/migration_guide.md)
