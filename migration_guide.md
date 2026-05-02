# Tekyida: Convex Cloud → Self-Hosted Migration Guide

> Migrating from `exciting-mule-748.eu-west-1.convex.cloud` to your local server.

## Prerequisites

- Your HP laptop (Ryzen 4650U / 16GB RAM / 512GB SSD) running as a server
- Docker & Docker Compose installed
- Node.js 18+ installed
- Your Tekyida project cloned on the server

---

## Phase 1: Export Data from Convex Cloud

> [!IMPORTANT]
> Do this from your development machine where the project currently points to Convex Cloud.

### 1.1 Verify current deployment

Your `.env.local` currently points to Cloud:

```env
CONVEX_DEPLOYMENT=dev:exciting-mule-748
NEXT_PUBLIC_CONVEX_URL=https://exciting-mule-748.eu-west-1.convex.cloud
```

### 1.2 Export all data

```bash
cd ~/projects/tekyida

# Export database + file storage to a ZIP
npx convex export --path ./backup.zip
```

This creates `backup.zip` containing:
- All tables as JSONL files (notebooks, contacts, experiences, transactions, auth tables)
- All `_id` and `_creationTime` fields preserved
- File storage contents (if any)

> [!TIP]
> If you have files in Convex file storage, add `--include-file-storage`:
> ```bash
> npx convex export --include-file-storage --path ./backup.zip
> ```

---

## Phase 2: Set Up Self-Hosted Convex Backend

### 2.1 Create the Convex backend directory on your server

```bash
mkdir -p ~/docker/convex-backend
cd ~/docker/convex-backend
```

### 2.2 Download the official Docker Compose file

```bash
curl -O https://raw.githubusercontent.com/get-convex/convex-backend/main/self-hosted/docker/docker-compose.yml
```

### 2.3 Create a `.env` file for Docker Compose

```bash
cat > .env << 'EOF'
# Ports
PORT=3210
SITE_PROXY_PORT=3211
DASHBOARD_PORT=6791

# Set these to your server's LAN IP or domain
# Replace 192.168.x.x with your actual server IP
CONVEX_CLOUD_ORIGIN=http://192.168.x.x:3210
CONVEX_SITE_ORIGIN=http://192.168.x.x:3211
NEXT_PUBLIC_DEPLOYMENT_URL=http://192.168.x.x:3210
EOF
```

> [!WARNING]
> Replace `192.168.x.x` with your server's actual LAN IP address.
> Find it with: `ip addr show | grep "inet " | grep -v 127.0.0.1`

### 2.4 Start the backend

```bash
docker compose up -d
```

Verify it's running:

```bash
# Check health
curl http://localhost:3210/version

# Check logs
docker compose logs -f backend
```

### 2.5 Generate an admin key

```bash
docker compose exec backend ./generate_admin_key.sh
```

**Save this key securely** — you'll need it for the CLI and dashboard.

### 2.6 Access the dashboard

Open `http://192.168.x.x:6791` in your browser and enter the admin key.

---

## Phase 3: Configure Convex Auth for Self-Hosted

> [!IMPORTANT]
> Since Tekyida uses `@convex-dev/auth` with Password provider, you need to manually set up JWT keys on the self-hosted instance. The CLI wizard doesn't support self-hosted yet.

### 3.1 Generate JWT keys

Create a temporary script:

```bash
cat > /tmp/generateKeys.mjs << 'SCRIPT'
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

process.stdout.write(
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`,
);
process.stdout.write("\n");
process.stdout.write(`JWKS=${jwks}`);
process.stdout.write("\n");
SCRIPT

node /tmp/generateKeys.mjs
```

This outputs two environment variables: `JWT_PRIVATE_KEY` and `JWKS`.

### 3.2 Set environment variables on self-hosted

```bash
cd ~/projects/tekyida

# Set the JWT keys (paste the values from the previous step)
npx convex env set JWT_PRIVATE_KEY '<paste the full JWT_PRIVATE_KEY value>'
npx convex env set JWKS '<paste the full JWKS value>'

# Set the site URL (your frontend URL)
npx convex env set SITE_URL http://192.168.x.x:3000
```

> [!NOTE]
> Since you're only using the Password provider (no OAuth), the `SITE_URL` is less critical
> but should still be set to your frontend's address.

---

## Phase 4: Import Data & Deploy Functions

### 4.1 Update `.env.local` to point to self-hosted

In your Tekyida project, update `.env.local`:

```env
# Self-hosted Convex backend
CONVEX_SELF_HOSTED_URL=http://192.168.x.x:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<your-generated-admin-key>

NEXT_PUBLIC_CONVEX_URL=http://192.168.x.x:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://192.168.x.x:3211
```

Remove or comment out the old Cloud variables:

```env
# CONVEX_DEPLOYMENT=dev:exciting-mule-748
# NEXT_PUBLIC_CONVEX_URL=https://exciting-mule-748.eu-west-1.convex.cloud
# NEXT_PUBLIC_CONVEX_SITE_URL=https://exciting-mule-748.eu-west-1.convex.site
```

### 4.2 Update Convex CLI to latest

```bash
npm install convex@latest
```

### 4.3 Deploy functions to self-hosted

```bash
npx convex dev
```

This pushes your schema and all functions (notebooks, contacts, experiences, transactions, auth) to the self-hosted backend.

### 4.4 Import the data

```bash
npx convex import ./backup.zip
```

This restores all your data with preserved IDs and relationships.

> [!TIP]
> If you need to re-import (e.g., after a test), use `--replace`:
> ```bash
> npx convex import ./backup.zip --replace
> ```

---

## Phase 5: Deploy the Next.js Frontend

### 5.1 Build the frontend

```bash
cd ~/projects/tekyida
npm run build
```

### 5.2 Run in production

```bash
npm run start
```

By default Next.js starts on port 3000.

### 5.3 (Optional) Run as a systemd service

```bash
sudo cat > /etc/systemd/system/tekyida.service << 'EOF'
[Unit]
Description=Tekyida Next.js App
After=network.target docker.service

[Service]
Type=simple
User=mehdi
WorkingDirectory=/home/mehdi/projects/tekyida
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tekyida
sudo systemctl start tekyida
```

---

## Phase 6: (Optional) Reverse Proxy with Caddy

If you want to access the app via a clean URL (e.g., `tekyida.local`), set up Caddy:

```
tekyida.local {
    reverse_proxy localhost:3000
}

convex.local {
    reverse_proxy localhost:3210
}

convex-site.local {
    reverse_proxy localhost:3211
}

convex-dashboard.local {
    reverse_proxy localhost:6791
}
```

> [!WARNING]
> If using a reverse proxy, update the `CONVEX_CLOUD_ORIGIN`, `CONVEX_SITE_ORIGIN`,
> and `NEXT_PUBLIC_CONVEX_URL` variables to match the proxy URLs.

---

## Phase 7: Verification Checklist

| Step | Check | Command / Action |
|---|---|---|
| Backend running | `curl http://localhost:3210/version` returns a version | ✅ |
| Dashboard accessible | Open `http://192.168.x.x:6791` | ✅ |
| Functions deployed | Dashboard shows your tables and functions | ✅ |
| Data imported | Dashboard shows your notebooks, contacts, etc. | ✅ |
| Auth works | Can log in with existing password credentials | ✅ |
| Frontend loads | Open `http://192.168.x.x:3000` | ✅ |
| Realtime works | Create a notebook — appears instantly without refresh | ✅ |
| Offline works | Toggle airplane mode → create item → go online → syncs | ✅ |

---

## Important Notes

> [!CAUTION]
> **Auth sessions will be invalidated.** Users will need to log in again after migration since the
> JWT keys are different. This is expected — the old Cloud-issued tokens won't work with new keys.

> [!IMPORTANT]
> **Backups are your responsibility now.** Set up a cron job to regularly export data:
> ```bash
> # Add to crontab: daily backup at 3 AM
> 0 3 * * * cd /home/mehdi/projects/tekyida && npx convex export --path /home/mehdi/backups/tekyida-$(date +\%Y\%m\%d).zip
> ```

> [!NOTE]
> **Updates:** To update the self-hosted backend:
> ```bash
> cd ~/docker/convex-backend
> docker compose pull
> docker compose up -d
> ```

---

## Resource Usage Summary

| Service | RAM | CPU | Disk |
|---|---|---|---|
| Convex Backend | ~1-2 GB | Minimal at idle | SQLite volume |
| Convex Dashboard | ~200 MB | Minimal | — |
| Next.js (Tekyida) | ~200 MB | Minimal | — |
| **Total** | **~1.5-2.5 GB** | **< 5% idle** | **< 1 GB** |

Out of your 16 GB / 12 threads → plenty of room for Immich, Kopia, and everything else.
