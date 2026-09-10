# Job Finder

A human-in-the-loop job-search system for **Tanmoy Sarkar** — targeting **full-time remote IT Technical Support roles (USA / UK priority)**.

Started: 2026-09-10 · Goal window: first recruiter calls in ~1–2 weeks, interview(s) organised within 30 days.

> **Honest note on the goal:** I can build the machine and run it hard, but nobody can *guarantee* an interview by a fixed date — that depends on the market and on employers. What this project does is maximise volume, targeting quality, and follow-up discipline, which is what actually moves the timeline. Progress is tracked openly in the dashboard so we can adjust weekly.

---

## The 5 agents

| # | Agent | What it does | Human step |
|---|-------|--------------|------------|
| 1 | **Job Scout** (`agents/1-job-scout.md`) | Searches job boards daily for fresh USA/UK remote IT-support roles, ranks by fit, outputs a digest. | You skim the shortlist. |
| 2 | **Resume Tailor** (`agents/2-resume-tailor.md`) | Keeps an ATS-optimised master resume; produces a per-job tailored version + keyword match. | You approve wording. |
| 3 | **Application Assistant** (`agents/3-application-assistant.md`) | Pre-fills every application (answers, cover note, tailored resume) so submitting is one click. | **You review + click Submit** on the employer's own site. |
| 4 | **Recruiter Outreach** (`agents/4-recruiter-outreach.md`) | Drafts direct emails / LinkedIn notes to the hiring recruiter, placed in Gmail **Drafts**. | **You read + click Send.** |
| 5 | **Response Chaser** (`agents/5-response-chaser.md`) | Tracks who was contacted, schedules follow-ups, drafts replies to any recruiter response fast (email / call prep / WhatsApp text). | You send / take the call. |

**Why human-in-the-loop:** job boards (LinkedIn, Indeed, Dice) ban automated applying and can permanently close your account; application forms require *you* to certify the info is true; and bulk auto-sent cold email gets a Gmail account flagged as spam. So the agents do 95% of the work and you do the final click.

---

## Daily routine (~15–20 min)

1. Open `job-search/digest-latest.md` — today's ranked roles.
2. For each "APPLY" role: open `applications/queue/` → the prepared packet → click through to employer site → paste → **Submit**.
3. Open Gmail **Drafts** — review the recruiter emails → **Send** the good ones.
4. Log outcomes in `applications/applications.csv` (or tell me and I'll log them).
5. Check `dashboard/index.html` for the running numbers.

## Weekly review (Sundays)

- Response rate, interview rate, which role types / boards convert.
- Adjust targeting, resume wording, outreach templates.

---

## Folder map

```
resume/        master resume + tailoring guide + change log
job-search/    board search links, daily digests
applications/  applications.csv tracker + queue/ of prepared packets
outreach/      recruiter email / LinkedIn / follow-up templates
dashboard/     index.html — standalone offline dashboard (no server)
app/           the web app: backend/ (Express API) + frontend/ (React)
agents/        the 5 agent role definitions
scripts/       helper notes
```

## The web app (`app/`)

Full-stack dashboard with a database, replacing the static `dashboard/index.html` for day-to-day use.

- **Backend** — Express + SQLite (via Node's built-in `node:sqlite`, no native deps). REST API for applications, outreach, events, computed stats, CSV import, and serving the latest digest. Port `4200`.
- **Frontend** — Vite + React + Recharts. Tabs: **Dashboard** (KPIs, 14-day activity, funnel, channel mix), **Applications** (add/edit/status), **Outreach** (recruiter messages + follow-ups), **Digest** (today's job list), **Calendar** (interview/call slots + follow-ups).

### Run it

```bash
cd "app" && npm run install:all
```

```bash
cd "app" && npm run dev
```

Dev: API on http://localhost:4200, UI on http://localhost:5273 (proxies `/api`).
Production single process: `npm --prefix app/frontend run build` then `node app/backend/src/server.js` → everything on http://localhost:4200.

Data lives in `app/backend/data/job-finder.db` (gitignored). Click **Import applications.csv** on the Dashboard to pull in the flat-file rows.

### Deploy
`app/Dockerfile` builds one image (API + built SPA). See `DEPLOY_AZURE.md` — same Azure Container Apps pattern as the stocks project.

## Connectors still needed

- **Google Calendar** — needs reconnect with write access (for the "Job Finder" schedule of applications logged + interview slots).
- **Gmail** — needs reconnect with draft/create access (for Agent 4 drafts).
- Until then, calendar entries and email drafts are kept as text in `outreach/` and `job-search/`.
