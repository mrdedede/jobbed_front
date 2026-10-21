# Project structure

How `src/` is organised and the conventions to keep. Setup and deployment are
in the [README](../README.md).

## Data flow

```
page ─► hook (useFetch / useMutation / useAsyncJob / ...) ─► api/endpoints/*.js ─► api/client.js ─► fetch /v1/...
                                                                                        ▲
                                                  auth/AuthContext.jsx gives it the token and the 401 handler
```

- **One function per endpoint** in `api/endpoints/`, named after what it does
  (`listCvs`, `startCvGeneration`). Each takes an optional `options` object
  (`signal`, `timeout`, ...) passed to `request`.
- **Hooks own the state**, pages only render it. A new API call means a new
  endpoint function, then either `useFetch` (reads) or `useMutation` (writes)
  in the page, or a dedicated hook when there is real logic (a loop, polling,
  optimistic updates).
- **Errors are `ApiError {status, detail, retryAfter}`**, with `status: 0` for a
  network failure or timeout. `api/stopReason.js` maps the backend's exact
  detail strings to UI kinds (`no-cv`, `busy`, `quota`, ...); `StopAlert`
  renders them.

## `src/`

| Path | What it is |
|---|---|
| `main.jsx` | Mantine provider (theme, colour scheme follows the OS), notifications, `<App>`. |
| `App.jsx` | Router: `/login` is public; everything else sits under `RequireAuth` and `AppShell`. |
| `routes.jsx` | The pages, lazy-loaded (one chunk each). Single source for the routes, the sidebar and page titles. |
| `api/client.js` | `fetch` wrapper: base URL, JSON, Bearer token, 15 s default timeout, `ApiError`, one 401 handler call per burst. |
| `api/endpoints/` | `auth`, `me`, `keywords`, `blacklist`, `cvs`, `analyses`, `generatedCvs`. |
| `api/stopReason.js` | `ApiError` to `{kind, message, retryAfter}` for runs and generations. |
| `auth/AuthContext.jsx` | Token store (localStorage, memory fallback) as an external store; auto-logout at `exp`, warning 5 min before, logout synced across tabs. |
| `auth/RequireAuth.jsx` | Layout route that redirects to `/login`, remembering the full URL. |
| `auth/validation.js` | Email and password rules, mirroring the back end's schemas. |
| `hooks/useFetch.js` | Load on mount and when deps change; aborts stale requests; `refetch`. |
| `hooks/useMutation.js` | A write call with loading/error and a toast on failure. |
| `hooks/usePolling.js` | Sequential polling with `key` (results never leak across keys) and retry of transient failures. |
| `hooks/useAsyncJob.js` | Start a server job, poll it to done/failed (built on `usePolling`). |
| `hooks/useAnalyzeRun.js` | The analyze loop: batches while `remaining > 0`, soft stop, 50-batch cap. |
| `hooks/useGenerateCv.js` | CV generation job plus the generated-CV list; recovers from "already running". |
| `hooks/useCvs.js`, `useAnalyses.js` | CV list with optimistic edits; analyses with debounced filters. |
| `components/layout/` | `AppShell` (header, sidebar, error boundary, `Suspense`, page title, shared `getMe` via outlet context), `NavLinks`. |
| `components/QueryState.jsx` | The loading / error + retry / empty states every list uses. |
| `components/StopAlert.jsx`, `ErrorBoundary.jsx` | Why a run stopped; a page crash shown in place instead of a blank app. |
| `components/TermList/` | Keywords and blacklist (same component, different endpoints). |
| `components/CvEditor/`, `components/cv/` | Markdown CV editor modal; the browser-only profile form (name, contact, languages, photo). |
| `components/analysis/` | `RunPanel`, `AnalysisTable` (keyboard-accessible rows, drawer), `GradeCharts`. |
| `cv/` | Generated CV JSON to lines (`sections.js`, port of the back end's `docx_gen.py`), localisation, Word (`toDocx.js`, lazy) and PDF via the print dialog (`toPdf.js`), profile storage. |
| `pages/` | One folder per page; page-specific tests next to them. |
| `test/` | `setup.js` (jsdom stubs Mantine needs), `utils.jsx` (`mockFetch`, `renderWithProviders`, `fakeToken`). |
| `theme/theme.js` | Mantine theme (violet primary). |

## Outside `src/`

| Path | What it is |
|---|---|
| `vite.config.js` | Dev proxy (`/v1`, `/healthz` to `VITE_PROXY_TARGET`) and the Vitest config. |
| `Dockerfile` | Node build stage (lint, test, build), then `nginx-unprivileged`. |
| `nginx.conf`, `security-headers.conf` | SPA serving, caching, gzip, security headers, `/healthz`. |
| `k8s/front.yaml`, `k8s/ingress.yaml` | Deployment + Service; Ingress routing `/v1` to the API, the rest here. |
| `.oxlintrc.json` | Lint rules. |

## Conventions

- Plain JavaScript (`.js`/`.jsx`), ES modules, explicit extensions in imports,
  single quotes, semicolons, 2-space indent, JSDoc on exported functions.
- Mantine components and style props; no CSS files beyond `index.css`.
- Every request takes the `AbortSignal` of the hook that made it; nothing sets
  state after an abort.
- Match backend error *details* exactly (see `stopReason.js`), and keep limits
  in step with `../joblister_back/api/routers/user.py` (`MAX_TERMS`, `MAX_CVS`).
- New behaviour comes with a test next to it; a bug fix with a test that fails
  without it.
