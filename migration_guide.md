# Tekyida: Convex Cloud to Self-Hosted Migration

This guide migrates Tekyida from a Convex Cloud production deployment to an existing self-hosted Convex stack.

It is specific to this repository:

- Next.js `16.2.6` requires Node.js `20.9.0` or newer.
- Tekyida uses `@convex-dev/auth` with the Password provider.
- `convex/schema.ts` includes `authTables`, so password accounts migrate with the database snapshot.
- `convex/auth.config.ts` and `convex/http.ts` are already correct for self-hosting.
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

The snapshot contains Tekyida's normal tables and the Convex Auth tables, including users and password credentials. Existing users should be able to sign in with the same email and password after migration.

Existing browser sessions should be considered invalid after cutover because the self-hosted deployment has a different auth issuer and new JWT signing keys. Users will need to sign in again.

Record the verified production source in the Git-ignored `.env.convex-cloud`
file described below. Do not put its real identifiers or URLs in this guide.

| Setting | Placeholder |
|---|---|
| Deployment | `prod:<cloud-production-deployment>` |
| Cloud URL | `https://<cloud-production-deployment>.<region>.convex.cloud` |
| HTTP Actions URL | `https://<cloud-production-deployment>.<region>.convex.site` |

Before the final export, confirm the live frontend uses the production Cloud URL recorded in the protected file. Never export a development deployment by mistake.

> [!CAUTION]
> The export contains personal data and password credential hashes. The Convex environment export and generated JWT private key contain secrets. Store all migration artifacts outside the Git repository with restrictive permissions.

## 3) Prerequisites

- The self-hosted Convex backend, site proxy, and dashboard are healthy.
- You have its admin key.
- The self-hosted target is dedicated to Tekyida and can be overwritten.
- Node.js `20.9.0` or newer is installed on the migration machine.
- The project dependencies are installed with `npm ci`.
- You can still access the source Convex Cloud deployment.

Check the local tools:

```bash
cd /path/to/tekyida
node --version
npx convex --version
```

Check the self-hosted API:

```bash
curl -fsS https://convex-api.yourdomain.com/version
```

## 4) Keep cloud and self-hosted configuration separate

Do not copy `.env.local` if it points to the old development deployment. Create `.env.convex-cloud` with the verified production values:

```env
CONVEX_DEPLOYMENT=prod:<cloud-production-deployment>
NEXT_PUBLIC_CONVEX_URL=https://<cloud-production-deployment>.<region>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<cloud-production-deployment>.<region>.convex.site
```

Protect it:

```bash
cd /path/to/tekyida
chmod 600 .env.convex-cloud
```

Use this file as the authoritative record of the Cloud URLs, but do not pass it
to Cloud CLI commands with `--env-file` while this project is pinned to Convex
CLI `1.31.7`. In that version, supplying an env file containing
`CONVEX_DEPLOYMENT` but no `CONVEX_DEPLOY_KEY` prevents the CLI from loading the
Cloud login token in `~/.convex/config.json` and produces a misleading
`MissingAccessToken` error. The Cloud commands below set
`CONVEX_DEPLOYMENT` for one process and specify the deployment name explicitly.

Create `.env.convex-selfhosted`:

```env
CONVEX_SELF_HOSTED_URL=https://convex-api.yourdomain.com
CONVEX_SELF_HOSTED_ADMIN_KEY=<self-hosted-admin-key>
NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com
```

Then protect it:

```bash
chmod 600 .env.convex-selfhosted
```

The repository already ignores `.env*` except `.env.example`. Confirm before continuing:

```bash
git status --short
```

Neither credential file should appear.

## 5) Make a rehearsal Cloud export

Authenticate this machine with the Convex account that has access to the
production deployment. This only authenticates the CLI; it does not deploy
functions or start a watcher:

```bash
npx convex login --force --device-name migration-workstation
npx convex login status
```

Confirm that the expected Convex team is listed. Do not use `npx convex dev` to
authenticate during the migration because it can push local functions to the
selected deployment.

Create a protected backup directory outside the repository:

```bash
mkdir -p "$HOME/backups/tekyida-migration"
chmod 700 "$HOME/backups/tekyida-migration"
```

Load the protected Cloud configuration into the current shell and derive the
deployment name without printing it:

```bash
set -a
. ./.env.convex-cloud
set +a
CLOUD_DEPLOYMENT_NAME="${CONVEX_DEPLOYMENT#*:}"
```

Export the database and file storage explicitly from that deployment:

```bash
npx convex export \
  --deployment-name "$CLOUD_DEPLOYMENT_NAME" \
  --include-file-storage \
  --path "$HOME/backups/tekyida-migration/cloud-rehearsal.zip"
```

Back up the Cloud deployment environment variables separately:

```bash
umask 077
npx convex env --deployment-name "$CLOUD_DEPLOYMENT_NAME" list \
  > "$HOME/backups/tekyida-migration/cloud-environment.txt"
test -s "$HOME/backups/tekyida-migration/cloud-environment.txt"
chmod 600 "$HOME"/backups/tekyida-migration/cloud-*
```

The values loaded from `.env.convex-cloud` exist only in the current shell and
do not modify `.env.local` or either dedicated environment file. The validation
block below unsets them when it finishes. Continue using
`--env-file .env.convex-selfhosted` for self-hosted commands; that file contains
the self-hosted admin key and does not rely on the Cloud login token.

Validate that the ZIP can be read:

```bash
unzip -t "$HOME/backups/tekyida-migration/cloud-rehearsal.zip"
unzip -l "$HOME/backups/tekyida-migration/cloud-rehearsal.zip"
unset CLOUD_DEPLOYMENT_NAME CONVEX_DEPLOYMENT
unset NEXT_PUBLIC_CONVEX_URL NEXT_PUBLIC_CONVEX_SITE_URL
```

The archive should include Tekyida tables such as `notebooks`, `contacts`, `experiences`, and `transactions`, plus Convex Auth tables such as `users` and `authAccounts`. If file storage is in use, it also contains `_storage` entries.

## 6) Deploy Tekyida's Convex code to self-hosted

Use the installed project version first. Do not upgrade Convex or `@convex-dev/auth` during the migration; dependency upgrades and data migration should be separate changes.

Run a deployment preview:

```bash
npx convex deploy \
  --env-file .env.convex-selfhosted \
  --dry-run
```

Deploy the schema and functions:

```bash
npx convex deploy --env-file .env.convex-selfhosted
```

This deploys the current schema, notebooks, contacts, experiences, transactions, user functions, and Convex Auth HTTP routes to the selected self-hosted backend.

> [!WARNING]
> Do not use `npx convex dev` with the self-hosted production credentials. It watches local files and continuously changes the selected backend.

## 7) Configure Convex Auth on self-hosted

Tekyida's source files already contain the required Convex Auth code. The self-hosted deployment still needs `JWT_PRIVATE_KEY` and `JWKS`. `SITE_URL` is optional for a password-only provider, but set it to the production frontend URL for a complete configuration.

Create `generateKeys.mjs` temporarily in the project root:

```js
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

process.stdout.write(
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"\n`,
);
process.stdout.write(`JWKS='${jwks}'\n`);
```

Generate a protected environment file:

```bash
node generateKeys.mjs > .env.auth-selfhosted
chmod 600 .env.auth-selfhosted
```

Load the values into the current shell and send them over the self-hosted admin connection without putting the private key in shell history:

```bash
set -a
. ./.env.auth-selfhosted
set +a

printf '%s' "$JWT_PRIVATE_KEY" | \
  npx convex env --env-file .env.convex-selfhosted set JWT_PRIVATE_KEY

printf '%s' "$JWKS" | \
  npx convex env --env-file .env.convex-selfhosted set JWKS

npx convex env --env-file .env.convex-selfhosted \
  set SITE_URL https://tekyida.yourdomain.com

unset JWT_PRIVATE_KEY JWKS
rm generateKeys.mjs
```

Store `.env.auth-selfhosted` in an encrypted secret backup or delete it after the deployment is verified. Never commit it.

Do not manually set `CONVEX_SITE_URL`. The self-hosted backend supplies it from the stack's `CONVEX_SITE_ORIGIN`, which must be `https://convex-site.yourdomain.com`.

## 8) Rehearse the import

Import the rehearsal snapshot into the self-hosted target:

```bash
npx convex import \
  --env-file .env.convex-selfhosted \
  --replace-all \
  "$HOME/backups/tekyida-migration/cloud-rehearsal.zip"
```

`--replace-all` is intentional only because this target is the dedicated Tekyida deployment and the migration must reproduce the Cloud snapshot exactly. It deletes target documents not present in the snapshot.

Verify in the self-hosted dashboard:

- Application and auth tables exist.
- Approximate document counts match Cloud.
- Functions are deployed.
- A known existing email/password can sign in through a test frontend pointed at self-hosted.
- That user sees the expected notebooks, contacts, experiences, and transactions.

Do not switch production traffic yet. The Cloud source may have changed since the rehearsal export.

## 9) Prepare the Tekyida frontend

The browser bundle needs only the public URLs, never the self-hosted admin key.

In the Dokploy frontend application's environment, set:

```env
NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com
```

Remove `CONVEX_DEPLOYMENT` from the production frontend service unless that service also runs Convex CLI commands. Never expose `CONVEX_SELF_HOSTED_ADMIN_KEY` as a public or browser variable.

Next.js embeds `NEXT_PUBLIC_*` values at build time, so changing them requires a fresh frontend build and deployment. Do not merely restart an old image.

The current application code does not require changes:

- `components/ConvexClientProvider.tsx` reads `NEXT_PUBLIC_CONVEX_URL`.
- `convex/auth.config.ts` correctly uses the backend-provided `CONVEX_SITE_URL`.
- `convex/http.ts` registers the Convex Auth routes.
- `convex/schema.ts` includes all `authTables`.

Keep using the explicit `.env.convex-selfhosted` file for production maintenance commands. Do not make the production admin credentials the default day-to-day `.env.local`; use a separate local or remote development deployment for `npx convex dev`.

## 10) Final cutover

Choose a short maintenance window.

### 10.1 Drain Tekyida's offline queue

Before the final export, every active device must be online and Tekyida's sync indicator must show no pending mutations.

This is critical for this project. The IndexedDB mutation queue automatically replays against whichever backend the newly loaded frontend uses. If it replays while the user is signed out after migration, the current queue implementation can treat the auth failure as permanent and discard the queued mutation.

Do not clear browser storage or uninstall the PWA until the pending count is zero.

### 10.2 Stop writes to Cloud

Put the frontend into maintenance mode or otherwise stop user writes. Installed PWAs and already-open tabs may remain active, so notify users to close the application after it reports fully synced.

### 10.3 Take the final snapshot

Remove an older file with the same name if necessary, or choose a new timestamped filename. Then run:

```bash
set -a
. ./.env.convex-cloud
set +a
CLOUD_DEPLOYMENT_NAME="${CONVEX_DEPLOYMENT#*:}"

npx convex export \
  --deployment-name "$CLOUD_DEPLOYMENT_NAME" \
  --include-file-storage \
  --path "$HOME/backups/tekyida-migration/cloud-final.zip"

unzip -t "$HOME/backups/tekyida-migration/cloud-final.zip"
unset CLOUD_DEPLOYMENT_NAME CONVEX_DEPLOYMENT
unset NEXT_PUBLIC_CONVEX_URL NEXT_PUBLIC_CONVEX_SITE_URL
```

Do not allow new Cloud writes after this export completes.

### 10.4 Replace the rehearsal data

```bash
npx convex import \
  --env-file .env.convex-selfhosted \
  --replace-all \
  "$HOME/backups/tekyida-migration/cloud-final.zip"
```

### 10.5 Deploy the frontend

Build and deploy the Tekyida frontend through Dokploy with the self-hosted public URL variables from Section 9.

After deployment:

1. Open Tekyida in a fresh private browser window.
2. Sign in with an existing Cloud account's email and password.
3. Verify its data.
4. Create, edit, and delete a test record.
5. Verify realtime updates in a second browser.
6. Test offline queueing with a disposable record.
7. Confirm the self-hosted dashboard receives the writes.

Users should close and reopen installed PWAs after the cutover. They must sign in again. If a device keeps an old frontend bundle, reload it while online; clear site data only after confirming its offline queue was already empty.

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

Use the browser network inspector to confirm there are no requests to either
old Convex Cloud URL recorded in `.env.convex-cloud`.

## 12) Rollback

Keep the Cloud deployment and final snapshot intact until the self-hosted system has been stable and backed up.

Before accepting writes on self-hosted, rollback is simple: restore the Cloud `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` in Dokploy and rebuild the frontend.

After accepting writes on self-hosted, do not point users back to the stale Cloud snapshot without reconciling new data. Export self-hosted first and plan a reverse migration or maintenance window.

## 13) Backups after migration

The Docker volume is persistence, not a backup. From a protected machine that has `.env.convex-selfhosted`:

```bash
npx convex export \
  --env-file .env.convex-selfhosted \
  --include-file-storage \
  --path "$HOME/backups/tekyida-snapshot.zip"

npx convex env --env-file .env.convex-selfhosted list \
  > "$HOME/backups/tekyida-environment.txt"
```

Encrypt and copy both files off the server. The environment export contains the Convex Auth signing key and other application secrets. Use unique snapshot filenames in automation because Convex export refuses to overwrite an existing path.

Periodically restore a snapshot into a disposable Convex stack. A backup is not proven until a restore succeeds.

## 14) Corrections from the previous guide

- Uses the existing Dokploy/Cloudflare Convex deployment instead of installing another backend.
- Requires Node.js `20.9+`, matching this project's Next.js version.
- Always includes file storage when claiming a complete snapshot.
- Pins Cloud commands to the deployment loaded from the protected Cloud
  environment file without triggering the Convex CLI `1.31.7` `--env-file`
  authentication bug, while self-hosted commands keep using their admin-key
  environment file.
- Uses `npx convex deploy`, not a production `npx convex dev` watcher.
- Uses the valid snapshot replacement flag `--replace-all`.
- Preserves password accounts by importing the Convex Auth tables.
- Generates new JWT keys without placing the private key in shell history.
- Accounts for the PWA service worker and Tekyida's IndexedDB offline mutation queue.
- Uses Dokploy for the frontend instead of a second systemd/Caddy deployment.

## 15) Official references

- [Convex self-hosting](https://docs.convex.dev/self-hosting)
- [Convex export CLI](https://docs.convex.dev/cli/reference/export)
- [Convex import CLI](https://docs.convex.dev/cli/reference/import)
- [Convex Auth manual setup](https://labs.convex.dev/auth/setup/manual)
- [Convex backup and restore](https://docs.convex.dev/database/backup-restore)
