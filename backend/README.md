# Backend (`@tekyida/backend`)

This package contains the [Convex](https://convex.dev) backend schema, auth configuration, and server functions.

## Structure

```text
backend/
├── convex/
│   ├── _generated/       # Convex generated client and server code
│   ├── auth.config.ts    # Convex auth configuration
│   ├── auth.ts           # Authentication logic
│   ├── schema.ts         # Database schema definition
│   ├── users.ts          # User management queries & mutations
│   ├── contacts.ts       # Contacts queries & mutations
│   ├── experiences.ts    # Experiences queries & mutations
│   ├── notebooks.ts      # Notebooks queries & mutations
│   ├── transactions.ts   # Transactions queries & mutations
│   └── http.ts           # HTTP endpoints
├── package.json
└── tsconfig.json
```

## Running Locally

From the repository root:
```bash
npm run dev:backend
```

Or from within `backend/`:
```bash
cd backend
npx convex dev
```

## Deploying

```bash
cd backend
npx convex deploy
```
