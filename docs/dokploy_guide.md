# Dokploy Deployment Guide for Tekyida

This guide describes how to deploy the **Tekyida Frontend** and **Convex Backend** using [Dokploy](https://dokploy.com).

---

## 1. Tekyida Frontend Deployment (Web App)

The frontend is a standalone Next.js 16 application located in `frontend/`.

### Application Setup in Dokploy

1. Go to your Dokploy Dashboard and click **Create Application**.
2. Select your Git provider and repository (`tekyida`).
3. Set the target branch (e.g. `main`).

### Build Configuration

Under the **General / Build** tab, configure the Docker paths:

| Setting | Value | Explanation |
|---|---|---|
| **Build Type** | `Dockerfile` | Uses the Dockerfile inside `frontend/` |
| **Docker File** | `frontend/Dockerfile` | Path from the repository root to the Dockerfile |
| **Docker Context Path** | `.` | Sets build context root to repository root so Next.js accesses shared `backend/convex` types |

### Ports & Networking

- **Container Port**: `3000`
- **Domain**: Assign your public domain (e.g., `tekyida.yourdomain.com`). Ensure HTTPS/SSL is enabled.

### Environment & Build-Time Variables

> [!IMPORTANT]
> Next.js embeds `NEXT_PUBLIC_*` variables into the browser bundle at compile time. You must add these in **Environment → Build Time Arguments** in addition to the standard environment tab.

Add the following variables:

```env
NEXT_PUBLIC_CONVEX_URL=https://convex-api.yourdomain.com
NEXT_PUBLIC_CONVEX_SITE_URL=https://convex-site.yourdomain.com
```

Click **Deploy**. Dokploy will pull the repo, build the Next.js container, and start serving on port 3000.

---

## 2. Convex Backend Deployment (`convex-stack`)

The Convex backend runs as a Dokploy **Docker Compose** service using the official images (`convex-backend` + `postgres:17`).

### Compose Configuration

In Dokploy, create or edit the `convex-stack` Compose service:

```yaml
services:
  backend:
    image: ghcr.io/get-convex/convex-backend:${CONVEX_REV:-latest}
    container_name: convex-backend
    restart: unless-stopped
    stop_grace_period: 10s
    stop_signal: SIGINT
    expose:
      - "3210"
      - "3211"
    volumes:
      - convex-data:/convex/data
    environment:
      CONVEX_CLOUD_ORIGIN: https://${API_HOST}
      CONVEX_SITE_ORIGIN: https://${SITE_HOST}
      INSTANCE_NAME: ${INSTANCE_NAME}
      INSTANCE_SECRET: ${INSTANCE_SECRET}
      APPLICATION_MAX_CONCURRENT_MUTATIONS: "16"
      APPLICATION_MAX_CONCURRENT_NODE_ACTIONS: "16"
      APPLICATION_MAX_CONCURRENT_QUERIES: "16"
      APPLICATION_MAX_CONCURRENT_V8_ACTIONS: "16"
      DISABLE_METRICS_ENDPOINT: "true"
      RUST_LOG: info
      POSTGRES_URL: postgresql://convex:${POSTGRES_PASSWORD}@postgres:5432
      DO_NOT_REQUIRE_SSL: "1"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3210/version"]
      interval: 5s
      start_period: 10s
      timeout: 5s
      retries: 12
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=dokploy-network"
      - "traefik.http.routers.convex-api.rule=Host(`${API_HOST}`)"
      - "traefik.http.routers.convex-api.entrypoints=web"
      - "traefik.http.routers.convex-api.service=convex-api"
      - "traefik.http.services.convex-api.loadbalancer.server.port=3210"
      - "traefik.http.routers.convex-site.rule=Host(`${SITE_HOST}`)"
      - "traefik.http.routers.convex-site.entrypoints=web"
      - "traefik.http.routers.convex-site.service=convex-site"
      - "traefik.http.services.convex-site.loadbalancer.server.port=3211"

  postgres:
    image: postgres:17
    container_name: convex-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: convex
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: convex
    volumes:
      - convex-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U convex"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - dokploy-network

volumes:
  convex-data:
  convex-postgres-data:

networks:
  dokploy-network:
    external: true
```

---

## 3. Deploying Functions & Schema to the Backend

Whenever you update tables or functions in `backend/convex/`:

```bash
cd backend
npx convex deploy --env-file .env.convex-selfhosted
```

This deploys directly to your Dokploy-hosted Convex instance without needing to rebuild containers.
