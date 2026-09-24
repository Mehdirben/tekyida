# Architecture Overview

Tekyida is structured as a monorepo containing all platforms and services in a unified codebase.

```
tekyida/
├── docs/                 # Documentation, specifications, and architecture records
├── frontend/             # Next.js 16 Web Application (App Router, React 19)
├── backend/              # Convex backend functions, database schema, & auth
├── ios/                  # Native iOS application (SwiftUI + XcodeGen)
├── android/              # Native Android application (Kotlin + Jetpack Compose)
├── package.json          # Root npm workspace orchestrator
├── Dockerfile            # Container configuration for production deployment
└── compose.yaml          # Docker Compose service definition
```

## Workspaces & Packages

### 1. Backend (`backend/`)
- Powered by [Convex](https://convex.dev).
- Real-time reactivity, serverless database, queries, and mutations.
- Directory: `backend/convex/`.
- Run locally: `npm run dev:backend`.

### 2. Frontend (`frontend/`)
- Built with [Next.js](https://nextjs.org) (App Router), React 19, and Tailwind CSS.
- Connects directly to the Convex backend using `@convex-dev/auth` and `convex/react`.
- Types are shared seamlessly via `@/convex/*` mapping to `backend/convex/*`.
- Run locally: `npm run dev:frontend`.

### 3. iOS (`ios/`)
- Native SwiftUI implementation configured using XcodeGen (`project.yml`).
- Automated CI pipeline builds unsigned IPAs on push/release via GitHub Actions.

### 4. Android (`android/`)
- Modern Jetpack Compose & Kotlin project with Gradle.
- Connects to Convex using the Convex Kotlin client.
