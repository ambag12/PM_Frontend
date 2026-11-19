# SocketSoft PM — frontend

React 19 + Vite single-page app for project delivery: dashboards, epics, backlog, Kanban, sprints with
taskboard and burndown, issues, wiki, team, project settings, and the custom Tenders / HR / Remarks modules.
It talks to the Taiga-based API in [ambag12/Taiga_Project_management](https://github.com/ambag12/Taiga_Project_management).

- **Production:** https://pm.socketsoft.io (API: https://pm-api.socketsoft.io/api/v1/)
- **Theme:** SocketSoft dark by default (lime `#c8ff19` on near-black), with a light mode toggle in the top bar.

## Local development

```bash
npm ci
VITE_API_URL=http://localhost:8010/api/v1/ npm run dev     # point at any Taiga API
npm run lint && npm run build
```

`VITE_API_URL` is compiled into the bundle at build time (`src/api/client.js`).

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`:

1. **test** — `npm ci`, `npm run lint`, `npm run build`
2. **build** — builds the `web` target of the `Dockerfile` (static build served by unprivileged nginx on :8080)
   and pushes `ghcr.io/ambag12/pm-web:sha-<commit>` and `:latest` (private)
3. **deploy** — over SSH to the SocketSoft VPS: uploads `docker-compose.yml` + `deploy/pm.caddy` to `/opt/pm`,
   writes `/opt/pm/.env`, pulls the exact tag, starts it with `--wait`, installs the Caddy site file into the
   shared socketsoft Caddy and smoke-tests `https://pm.socketsoft.io/health`

The container publishes no ports; the socketsoft Caddy reaches it on its Docker network as `pm-web:8080`.

**Rollback:** `gh workflow run deploy.yml -R ambag12/PM_Frontend -f image_tag=sha-<old commit>`

### Secrets (repository secrets)

| Secret | Purpose |
|---|---|
| `PM_PUSH` | classic PAT with `write:packages` (CI pushes images) |
| `PM_PULL` | classic PAT with `read:packages` (server pulls, then logs out) |
| `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` | deploy key for the VPS |

Optional repository **variable** `VITE_API_URL` overrides the API URL baked into the build.
