# Tekyida

A modern, mobile-first IOU (I Owe You) tracker built with Next.js, Convex, SwiftUI, and Jetpack Compose.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## 📱 Mobile App Installation (iOS & Android)

Tekyida provides automated, direct-to-device app updates through community sideloading feeds hosted on **GitHub Pages**:

👉 **[Tekyida Mobile Installation Portal](https://mehdirben.github.io/tekyida/)**

| Platform | Store / Method | Source URL | Quick Action |
| :--- | :--- | :--- | :--- |
| **iOS** | SideStore / AltStore | `https://mehdirben.github.io/tekyida/ios/apps.json` | [⚡ Add to SideStore](sidestore://source?url=https%3A%2F%2Fmehdirben.github.io%2Ftekyida%2Fios%2Fapps.json) |
| **Android** | F-Droid / Droid-ify | `https://mehdirben.github.io/tekyida/fdroid/repo` | [⚡ Add to F-Droid](fdroidrepo://mehdirben.github.io/tekyida/fdroid/repo?fingerprint=E48D12FB013F44B533153C957BFF75B7702DE74595F6054CBF464F7E64A31DC3) |

> Complete instructions and QR codes are available in the [Mobile Distribution Guide](docs/mobile_distribution.md).

---

## 🏗 Architecture

Tekyida is a monorepo consisting of:

- **`frontend/`** — Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **`backend/`** — Convex reactive database, Auth, Mutations & Queries
- **`ios/`** — Native iOS app (SwiftUI, XcodeGen, LiveContainer-compatible unsigned IPA)
- **`android/`** — Native Android app (Kotlin, Jetpack Compose, Material 3, signed APK)
- **`distribution/`** — Mobile distribution assets (F-Droid repository & SideStore portal)
- **`tests/`** — Centralized test harness, code duplication checks, quality gates

```text
tekyida/
├── frontend/                 # Next.js web application
│   ├── app/                  # App Router pages and layouts
│   ├── components/           # UI components
│   └── lib/                  # Utilities, offline queue, state management
│
├── backend/                  # Convex backend
│   ├── convex/               # Schemas, queries, mutations, auth
│   └── vitest.config.ts      # Backend test configuration
│
├── ios/                      # Native iOS application
│   ├── Sources/App/          # SwiftUI views, models, networking
│   ├── Tests/                # iOS Unit & UI test suites
│   └── project.yml           # XcodeGen configuration
│
├── android/                  # Native Android application
│   ├── app/src/main/         # Jetpack Compose UI, ViewModels, repository
│   └── app/src/test/         # Android Unit & Security test suites
│
├── distribution/             # Sideloading feeds and portals
│   ├── portal/               # Web portal for SideStore / F-Droid
│   └── fdroid/               # F-Droid repo config, keystore, metadata
│
├── tests/                    # Quality gate & validation harness
│   ├── run.sh                # Main test runner (100% test coverage)
│   └── jscpd.json            # Strict duplication configuration
│
├── .github/                  # GitHub Actions CI/CD workflows
├── LICENSE                   # GNU Affero General Public License v3.0
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
2. Let Gradle sync dependencies.\n3. Run on an emulator or Android device.

---

## 📚 Documentation

Detailed documentation is in [docs/](docs/):
- [Mobile App Distribution Guide](docs/mobile_distribution.md)
- [Architecture Overview](docs/architecture.md)
- [Dokploy Deployment Guide](docs/dokploy_guide.md)
- [Migration Guide](docs/migration_guide.md)
- [Test & Quality Plan](docs/tests-plan.md)

---

## 📄 License

Tekyida is free and open-source software licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). See the [LICENSE](LICENSE) file for the complete license terms.
