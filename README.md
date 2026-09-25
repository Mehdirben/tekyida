# Tekyida

A modern, mobile-first IOU (I Owe You) tracker built with Next.js, Convex, SwiftUI, and Jetpack Compose.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## 📱 Mobile App Installation (iOS & Android)

Tekyida provides automated, direct-to-device app updates through community sideloading feeds hosted on **GitHub Pages**:

👉 **[Tekyida Mobile Installation Portal](https://mehdirben.github.io/tekyida/)**

| Platform | Channel | Store / Method | Source URL | Quick Action |
| :--- | :--- | :--- | :--- | :--- |
| **iOS** | 🟢 Stable | SideStore / AltStore | `https://mehdirben.github.io/tekyida/ios/apps.json` | [⚡ Add Stable](sidestore://source?url=https%3A%2F%2Fmehdirben.github.io%2Ftekyida%2Fios%2Fapps.json) |
| **iOS** | 🟡 Beta | SideStore / AltStore | `https://mehdirben.github.io/tekyida/ios/beta/apps.json` | [⚡ Add Beta](sidestore://source?url=https%3A%2F%2Fmehdirben.github.io%2Ftekyida%2Fios%2Fbeta%2Fapps.json) |
| **Android** | 🟢 Stable | F-Droid / Droid-ify | `https://mehdirben.github.io/tekyida/fdroid/repo` | [⚡ Add Stable](fdroidrepo://mehdirben.github.io/tekyida/fdroid/repo?fingerprint=E48D12FB013F44B533153C957BFF75B7702DE74595F6054CBF464F7E64A31DC3) |
| **Android** | 🟡 Beta | F-Droid / Droid-ify | `https://mehdirben.github.io/tekyida/fdroid/beta/repo` | [⚡ Add Beta](fdroidrepo://mehdirben.github.io/tekyida/fdroid/beta/repo?fingerprint=E48D12FB013F44B533153C957BFF75B7702DE74595F6054CBF464F7E64A31DC3) |

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
├── backend/                  # Convex backend functions & schema
├── ios/                      # Native iOS SwiftUI client
├── android/                  # Native Android Compose client
├── distribution/             # F-Droid & SideStore distribution
└── tests/                    # Multi-tier quality gate runner
```
