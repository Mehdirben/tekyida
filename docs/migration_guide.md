# Tekyida: Convex Cloud to Self-Hosted Migration

This guide migrates Tekyida from a Convex Cloud production deployment to an existing self-hosted Convex stack.

It is specific to this repository:

- Next.js `16.2.6` requires Node.js `20.9.0` or newer.
- Tekyida is structured as a monorepo (`frontend/`, `backend/`, `ios/`, `android/`, `docs/`).
- Backend files & CLI commands run from `backend/` (e.g. `cd backend && npx convex ...`).
- Frontend files & Docker build run from `frontend/` (Dokploy builds `frontend/Dockerfile` with context `frontend`).
- Tekyida uses `@convex-dev/auth` with the Password provider.
- `backend/convex/schema.ts` includes `authTables`, so password accounts migrate with the database snapshot.
- `backend/convex/auth.config.ts` and `backend/convex/http.ts` are already correct for self-hosting.
- Tekyida has an IndexedDB offline mutation queue, which must be empty before the final cutover.

The self-hosted backend should already be deployed using:

- [Professional server Convex guide](../selfhosted-guides/selfhosted-professional/05-convex-setup-guide.md)

This guide does not deploy a second raw Docker or Caddy stack.

---

## 1) Migration endpoints

Replace these examples with the real public domains:

| Service | Example |
|---|---|
| Convex API | `https://convex-api.yourdomain.com` |
| Convex HTTP actions/auth | `https://convex-site.yourdomain.com` |
| Convex dashboard | `https://convex-dashboard.yourdomain.com` |
| Tekyida frontend | `https://tekyida.yourdomain.com` |

Do not use LAN IPs or plain HTTP for the production browser application. Cloudflare Tunnel and Traefik provide the public HTTPS routes.

## 2) Important migration behavior

- Tekyida uses `@convex-dev/auth` with the built-in Password provider. User passwords are saved as salted hashes in the database.
- A full snapshot export/import migrates users and passwords automatically. Users do not need to register again.
- Active login sessions will end. Every user must sign in again after cutover.
- Offline mutations in browser IndexedDB replay against the new backend once reconnecting. Drain queues before cutover to avoid losing offline writes.
- File storage entries in `_storage` are copied only if `--include-file-storage` is used.
- Environment variables set via `npx convex env set` are **not** included in snapshot exports. Recreate them on the self-hosted deployment.

## 3) Record the production source

> [!NOTE]
> All Convex CLI commands are run from the `backend/` directory where the backend code and environment files live:
> ```bash
> cd backend
> ```

Record the verified production source in the Git-ignored `backend/.env.convex-cloud`:

```env
CONVEX_DEPLOYMENT=prod:<deployment-name>
NEXT_PUBLIC_CONVEX_URL=https://<deployment-name>.<region>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<deployment-name>.<region>.convex.site
```

Protect the file:

```bash
chmod 600 backend/.env.convex-cloud
```

## 4) Record the target self-hosted deployment

Create `backend/.env.convex-selfhosted`:

```env
CONVEX_SELF_HOSTED_URL=https://convex-api.yourdomain.com
CONVEX_SELF_HOSTED_ADMIN_KEY=your-admin-key
NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com
```

Protect the file:

```bash
chmod 600 backend/.env.convex-selfhosted
```

Verify the self-hosted instance is responding:

```bash
curl -fsS https://convex-api.yourdomain.com/version
```

## 5) Rehearsal export from Cloud

Run from the `backend/` directory:

```bash
cd backend

set -a
. ./.env.convex-cloud
set +a
CLOUD_DEPLOYMENT_NAME="${CONVEX_DEPLOYMENT#*:}"

npx convex export \
  --deployment-name "$CLOUD_DEPLOYMENT_NAME" \
  --include-file-storage \
  --path "$HOME/backups/tekyida-migration/cloud-rehearsal.zip"
```

## 6) Deploy Tekyida's Convex code to self-hosted

From `backend/`:

```bash
cd backend
npx convex deploy --env-file .env.convex-selfhosted
```

This deploys the current schema, notebooks, contacts, experiences, transactions, user functions, and Convex Auth HTTP routes to the selected self-hosted backend.

> [!WARNING]
> Do not use `npx convex dev` with the self-hosted production credentials. It watches local files and continuously changes the selected backend.

## 7) Configure Convex Auth on self-hosted

Generate and configure JWT keys for self-hosted auth:

```bash
cd backend
npx convex env --env-file .env.convex-selfhosted set JWT_PRIVATE_KEY
npx convex env --env-file .env.convex-selfhosted set JWKS
```

Set Resend email variables if using email auth:

```bash
npx convex env --env-file .env.convex-selfhosted set AUTH_RESEND_KEY re_your_resend_api_key
npx convex env --env-file .env.convex-selfhosted set AUTH_EMAIL_FROM 'Tekyida <auth@yourdomain.com>'
```

## 8) Import rehearsal snapshot

```bash
cd backend
npx convex import \
  --env-file .env.convex-selfhosted \
  --replace-all \
  "$HOME/backups/tekyida-migration/cloud-rehearsal.zip"
```

## 9) Prepare the Tekyida frontend in Dokploy

The browser bundle needs only the public URLs, never the self-hosted admin key.

### Dokploy Build Configuration
In your Dokploy Dashboard, open the Tekyida Frontend Application and configure:

| Field in Dokploy | Setting |
|---|---|
| **Docker File** | `frontend/Dockerfile` |
| **Docker Context Path** | `frontend` |
| **Port** | `3000` |

### Environment & Build Time Arguments
In Dokploy's **Environment** tab and **Build Time Arguments** tab, set:

```env
NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com
```

> [!IMPORTANT]
> Next.js embeds `NEXT_PUBLIC_*` values into the client JavaScript bundle at build time. In Dokploy, you **must** set them in **Build Time Arguments** in addition to runtime environment variables.

Remove `CONVEX_DEPLOYMENT` from the production frontend service unless that service also runs Convex CLI commands. Never expose `CONVEX_SELF_HOSTED_ADMIN_KEY` as a public or browser variable.

## 10) Final cutover

Choose a short maintenance window.

### 10.1 Drain Tekyida's offline queue
Before the final export, ensure every active device is online and Tekyida's sync indicator reports no pending changes.

### 10.2 Stop writes to Cloud
Put the frontend in maintenance mode or notify users to stop making changes.

### 10.3 Take the final snapshot
```bash
cd backend
set -a
. ./.env.convex-cloud
set +a
CLOUD_DEPLOYMENT_NAME="${CONVEX_DEPLOYMENT#*:}"

npx convex export \
  --deployment-name "$CLOUD_DEPLOYMENT_NAME" \
  --include-file-storage \
  --path "$HOME/backups/tekyida-migration/cloud-final.zip"
```

### 10.4 Import to self-hosted
```bash
cd backend
npx convex import \
  --env-file .env.convex-selfhosted \
  --replace-all \
  "$HOME/backups/tekyida-migration/cloud-final.zip"
```

### 10.5 Deploy the frontend
Trigger a build and deployment in Dokploy (or push to the configured Git branch). Dokploy builds `frontend/Dockerfile` with context `frontend` and starts the updated container.

## 11) Verification checklist

| Check | Expected result |
|---|---|
| `curl https://convex-api.yourdomain.com/version` | Backend version response |
| Self-hosted dashboard | Tables and functions visible |
| Existing password account | Can sign in again |
| User data | Notebooks, contacts, experiences, and transactions match |
| Authorization | One user cannot access another user's records |
| Realtime | A second client updates without refresh |
| HTTP/auth site | `https://convex-site.yourdomain.com/.well-known/openid-configuration` responds |
| Offline queue | A disposable offline mutation syncs after reconnecting |
| Frontend build | Browser connects only to the new Convex domains |
