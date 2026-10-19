# Project Structure

A file-by-file guide to this repo: what each file/folder does and why it exists, with links to the relevant docs. Written after Phase 0 (scaffold) of the build — see `/Users/andre/.claude/plans/i-want-to-build-lucky-adleman.md` for the full plan and API contract this app is built against.

---

## Config / tooling (repo root)

### `.env`
Local dev config, **gitignored**. Currently holds `VITE_API_BASE_URL`, telling the frontend where the backend API lives. Vite exposes any variable prefixed `VITE_` to client code via `import.meta.env.VITE_*` — everything else is stripped out of the client bundle for safety.
- [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode)

### `.env.example`
Checked-in template for `.env`, so anyone cloning the repo knows what to set. Kept in sync by hand — Vite doesn't auto-generate this.

### `.gitignore`
Standard Vite ignores (`node_modules`, `dist`, editor files) plus `.env`, since env files are per-machine and shouldn't be committed.

### `.oxlintrc.json`
Config for [oxlint](https://oxc.rs/docs/guide/usage/linter.html), the linter Vite's React scaffold ships by default — a Rust-based, much faster alternative to ESLint. Currently just enables React hook-rules checks (`react/rules-of-hooks`) and a warning for non-component exports from component files.
- [Oxlint documentation](https://oxc.rs/docs/guide/usage/linter.html)
- [Oxlint rules reference](https://oxc.rs/docs/guide/usage/linter/rules.html)

### `package.json` / `package-lock.json`
Dependency manifest and lockfile. `scripts` are the Vite defaults: `dev`, `build`, `lint`, `preview`.
- [npm package.json docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Vite CLI reference](https://vite.dev/guide/cli)

### `vite.config.js`
Vite's own build/dev-server config. Currently just registers `@vitejs/plugin-react`, which gives Vite the JSX transform and React Fast Refresh (hot reload that preserves component state). Nothing custom yet.
- [Vite Configuration Reference](https://vite.dev/config/)
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md)

### `index.html`
The actual HTML page Vite serves — not processed like a template, but treated as a real entry point that Vite crawls for `<script>`/`<link>` tags. Contains `<div id="root">` (React's mount point) and `<script type="module" src="/src/main.jsx">` (the entry module). Title is "Joblister"; favicon points at `public/favicon.svg`.
- [Vite: index.html and Project Roots](https://vite.dev/guide/#index-html-and-project-root)

### `README.md`
Project overview and dev setup instructions (rewritten from the generic Vite template text).

---

## `public/`
Static files served as-is at the site root, untouched by Vite's bundler/hashing.
- [Vite: The public Directory](https://vite.dev/guide/assets#the-public-directory)

### `public/favicon.svg`
Browser tab icon, referenced from `index.html`. Currently a generic placeholder from the template — worth swapping for a real Joblister mark later.

---

## `src/` — entry & app shell

### `src/main.jsx`
The real entry point (imported by `index.html`). Mounts the React tree via `createRoot`, wraps everything in:
- `MantineProvider` — supplies the theme (`theme/theme.js`) and CSS variables to every Mantine component.
- `Notifications` — Mantine's toast/snackbar system, mounted once at the root. Not used yet, but will matter once actions like "scrape run started" or "download failed" need user-visible feedback.

Also imports the required Mantine CSS bundles (`core`, `charts`, `notifications` — Mantine ships these separately per-package rather than one big stylesheet) plus the project's own `index.css`.
- [React 19: createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [Mantine: MantineProvider](https://mantine.dev/theming/mantine-provider/)
- [Mantine: Notifications system](https://mantine.dev/x/notifications/)
- [Mantine: Styles and CSS imports](https://mantine.dev/styles/mantine-styles/)

### `src/index.css`
Global CSS reset. Deliberately minimal — trimmed down from the Vite template's opinionated landing-page styling (fixed 1126px centered column, custom color variables) because Mantine owns component styling, and a centered fixed-width body would conflict with `AppShell`'s full-width layout.

### `src/App.jsx`
Top-level component. Sets up `BrowserRouter` and maps the `navRoutes` array (from `routes.jsx`) into `<Route>` elements, all rendered inside `AppShell`.
- [React Router: BrowserRouter](https://reactrouter.com/en/main/router-components/browser-router)
- [React Router: Route](https://reactrouter.com/en/main/route/route)

### `src/routes.jsx`
Single source of truth for the app's 6 top-level pages. Each entry has `{ path, label, element }`. Both `App.jsx` (routing) and `NavLinks.jsx` (sidebar menu) read from this same array — adding a 7th page means editing one file, not two.

---

## `src/components/layout/`

### `AppShell.jsx`
Wraps Mantine's `AppShell` component: a fixed header (title bar), a collapsible left navbar (with a burger-menu toggle on mobile via `useDisclosure`), and a main content area that renders `children` (page content is passed in from `App.jsx` rather than using nested `<Outlet/>` routing, since there's no need for nested routes here).
- [Mantine: AppShell](https://mantine.dev/core/app-shell/)
- [Mantine: useDisclosure hook](https://mantine.dev/hooks/use-disclosure/)

### `NavLinks.jsx`
Renders the sidebar's list of links, one per entry in `routes.jsx`. Uses Mantine's `NavLink` component with React Router's `NavLink` swapped in via the `component` prop, so it gets Mantine's visual styling while React Router handles the actual navigation (`to` prop, client-side routing, no full page reload).

The `active` highlight is computed manually via `useLocation()` + `pathname === route.path`, **not** derived automatically from react-router's own active-state logic — Mantine's `NavLink.active` prop is a plain boolean, so wiring two different "active link" mechanisms from two different libraries together means one has to explicitly bridge them. This is correct as written, not redundant (confirmed by checking Mantine's type defs directly).
- [Mantine: NavLink](https://mantine.dev/core/nav-link/)
- [React Router: NavLink](https://reactrouter.com/en/main/components/nav-link)
- [React Router: useLocation](https://reactrouter.com/en/main/hooks/use-location)
- [Mantine: Component polymorphism (the `component` prop)](https://mantine.dev/guides/polymorphic/)

---

## `src/pages/*/`
Six folders (`Dashboard/`, `BoardsNoJobs/`, `ScrapeBoards/`, `ScrapeJobs/`, `AiAnalysis/`, `CvGeneration/`), each holding one placeholder page component today. Each folder (rather than a flat `pages/Dashboard.jsx`) leaves room for page-local sub-components later without a restructure. Right now every page is just a heading + one line of placeholder text — pure Phase 0 scaffolding, filled in during later build phases.
- [Mantine: Title](https://mantine.dev/core/title/) / [Text](https://mantine.dev/core/text/) — the two components used in every placeholder page.

---

## `src/theme/`

### `theme.js`
Mantine theme customization, passed into `MantineProvider`. Currently just sets `primaryColor: 'violet'`.
- [Mantine: Theme object reference](https://mantine.dev/theming/theme-object/)
- [Mantine: Colors](https://mantine.dev/theming/colors/)

### `chartColors.js`
A shared categorical color palette (plus a pinned grey for "other" / unclassified categories), so charts across the app — e.g. the scatter plot and bar charts on the "Boards without jobs" page — use consistent colors for the same categories. Seeded early since it was cheap; not consumed by any component yet (that happens once charts are built in a later phase).
- [Mantine Charts](https://mantine.dev/charts/getting-started/) (built on [Recharts](https://recharts.org/))

---

## Currently-empty scaffolded folders
`src/api/`, `src/api/endpoints/`, `src/hooks/`, `src/charts/` exist but are empty placeholders matching the planned architecture. They'll be filled in during the "shared infrastructure" build phase:
- `api/` — a generic `fetch` wrapper + one thin module per backend resource (dashboard, boards, scrape-boards, scrape-jobs, ai-analysis, cv).
- `hooks/` — `useFetch` (data loading), `usePolling` + `useAsyncJob` (for the long-running scrape/analysis/CV-gen jobs), `useTableQuery` (sortable/filterable tables).
- `charts/` — thin per-chart wrapper components built on `@mantine/charts`.

---

## Key library docs (for reference across the whole app)
- [React 19 docs](https://react.dev/) — the UI library itself.
- [Vite docs](https://vite.dev/guide/) — dev server & build tool.
- [Mantine documentation](https://mantine.dev/) — component library (`@mantine/core`, `@mantine/hooks`, `@mantine/charts`, `@mantine/notifications`).
- [React Router documentation](https://reactrouter.com/) — client-side routing.
- [Recharts](https://recharts.org/) — the charting engine underneath `@mantine/charts`.
- [react-markdown](https://github.com/remarkjs/react-markdown) — will render AI-analysis verdicts (markdown → React) in a later phase.
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) — will render in-browser DOCX previews (bold runs preserved) for generated CVs in a later phase.
