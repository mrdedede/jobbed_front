# Joblister front end

React 19 + Vite 8 + Mantine 9 app for the `joblister` back end
(`../joblister_back`). Users sign up, keep keywords, a blacklist and CVs, grade
recent job postings with an LLM, and generate a CV tailored to a posting
(downloaded as Word or PDF, rendered in the browser).

How the code is organised: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).
The API contract: the back end's `/docs` (OpenAPI) and
`../joblister_back/docs/cv-generation.md`.

## Pages

| Route | What it does |
|---|---|
| `/login` | Log in or sign up (JWT, 1 h, no refresh; a warning shows 5 min before it expires). |
| `/` | Dashboard: postings waiting, grades this week, active CV, generated CVs, top matches, setup checklist. |
| `/keywords`, `/blacklist` | Terms that pick (or drop) postings for analysis. Max 200 each. |
| `/cvs` | Markdown CVs, one active. Max 10. |
| `/ai-analysis` | Grade postings in batches (`POST /v1/me/analyze` in a loop), filter and read results. |
| `/cv-generation` | Generate a CV for a graded posting (background job, polled), download Word/PDF. |
| `/account` | Change password, delete the account. |

## Local development

The app always calls the API on its own origin (`/v1/...`): in development the
Vite dev server proxies `/v1` to the back end, in the cluster the ingress does.
No CORS anywhere.

1. Make the API reachable on your machine, e.g.

   ```bash
   kubectl port-forward svc/joblister-api 8080:8080
   ```

2. Point the proxy at it and start Vite:

   ```bash
   cp .env.example .env      # VITE_PROXY_TARGET=http://localhost:8080
   npm install
   npm run dev               # http://localhost:5173
   ```

| Variable | Used by | Meaning |
|---|---|---|
| `VITE_PROXY_TARGET` | `npm run dev` | Where the dev proxy sends `/v1` and `/healthz`. Must include `http://`. |
| `VITE_API_BASE_URL` | build | Optional. Prefix for API calls; leave unset (same origin). Setting it to another origin needs CORS on the API, which it does not have. |

## Checks

```bash
npm run lint    # oxlint on src/ (rules-of-hooks, exhaustive-deps, fast refresh)
npm test        # vitest + jsdom + Testing Library, about 100 tests
npm run build   # production bundle in dist/
```

Tests live next to the code (`*.test.js[x]`). Shared helpers are in
`src/test/`: `mockFetch({'GET /v1/me': json({...})})` stubs the API by method
and path, and `renderWithProviders(ui, {route})` wraps Mantine and a router.
The Docker build runs lint and tests, so an image with failing tests is never
built.

## Run it on minikube

Prerequisites: the back end deployed (`joblister-api` Service on 8080) and the
ingress addon.

```bash
minikube addons enable ingress

docker build -t joblister-front:dev .        # runs lint + tests first
minikube image load joblister-front:dev
kubectl apply -f k8s/                        # front Deployment/Service + Ingress
kubectl rollout restart deploy/joblister-front   # after loading a new image
```

The Ingress (`k8s/ingress.yaml`) has no host: `/v1` goes to `joblister-api:8080`
and everything else to the front end. Reach it:

- macOS with the docker driver: `minikube tunnel` (keep it running), then
  http://127.0.0.1, or without sudo:
  `kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8081:80`
  and http://localhost:8081.
- Linux / VM drivers: `http://$(minikube ip)`.

What the deployment sets up:

- **Image:** `nginxinc/nginx-unprivileged` serving `dist/` on port 8080 as uid
  101, read-only root filesystem (only `/tmp` is writable), all capabilities
  dropped. The Service maps port 80 to 8080.
- **nginx** (`nginx.conf`, `security-headers.conf`): SPA fallback, gzip,
  `index.html` never cached, hashed `/assets/` cached for a year, CSP and
  other security headers, `/healthz` for liveness (readiness checks `/`).
- **Ingress:** 300 s proxy timeouts (an analyze batch can take minutes; the
  client gives up at 170 s, before the ingress does) and a 1 MB body limit.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Every API call fails in `npm run dev` | `VITE_PROXY_TARGET` unset or wrong, or the port-forward stopped. |
| Pod stuck in `ErrImageNeverPull` | The image was not loaded: `minikube image load joblister-front:dev`. |
| Old UI after a deploy | Same tag, so restart the pods: `kubectl rollout restart deploy/joblister-front`. |
| "Refused to ..." in the browser console | Blocked by the CSP in `security-headers.conf`; widen only the directive named. |
| Logged out after an hour | Tokens last 1 h and cannot be refreshed; log in again. |
| "Another analysis is still running" | A run from a reload or another tab is still going; the page reloads results after 30 s. |
