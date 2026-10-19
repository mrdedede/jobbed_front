# Joblister Frontend

React + Vite dashboard for the `joblister` job-scraping / AI-grading / CV-generation pipeline. Replaces the project's Streamlit UI with pages for the dashboard, dead-board diagnostics, and the four scrape/analysis/CV-gen workflows, talking to a REST API over `VITE_API_BASE_URL` (see `.env.example`).

See `/Users/andre/.claude/plans/i-want-to-build-lucky-adleman.md` for the API contract and phased build plan this app is being built against.

## Development

```bash
cp .env.example .env   # point at your local API
npm install
npm run dev
```
