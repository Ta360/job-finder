# Job Finder — calendar & 30-day cadence

**Dedicated "Job Finder" Google calendar created 2026-09-10** via the app's own API
(`POST /api/calendar` → `calendars.insert`). The three primary-calendar `[Job Finder]`
events were deleted; the holds now live on the separate calendar:
- Daily 09:15 IST — "[Job Finder] Review digest + apply (15–20 min)"  (popup 10 min before)
- Daily 18:00 IST — "[Job Finder] Send recruiter drafts + log outcomes"
- Sundays 11:00 IST — "[Job Finder] Weekly review — response rates + retarget"

Calendar id: `666c1e8922662fd2c39ee2ce6350611b9461f0848c9e192b062b679a7855783f@group.calendar.google.com`
Manage from the dashboard → Calendar tab, or:
`curl -X POST http://localhost:4200/api/calendar/google-events -H "content-type: application/json" -d '{"summary":"Interview — Acme","start":"2026-09-20T18:00:00","end":"2026-09-20T18:45:00","reminderMinutes":60}'`

Interview / call slots get added there as they're booked.

Two recruiter outreach emails are sitting in **Gmail Drafts** (Porch, Anovia) — each needs a
recruiter address + the resume attached before you send.

Cadence:

## Week 1 (Sep 10–16) — volume + setup
- Confirm resume fixes (`resume/change-log.md`); I generate PDF/DOCX/TXT.
- Fix LinkedIn profile + URL; turn on "Open to work" (recruiters only).
- Apply: 8–12/day (India-remote first, then US/UK). Target ≥ 50 by Sunday.
- Recruiter drafts: 5–10/day where a contact is findable.

## Week 2 (Sep 17–23) — outreach + follow-up
- Keep 8–12 applications/day.
- Follow-up #1 on everything from week 1 with no reply.
- Expect first replies here. Any reply → Agent 5 books a call within 48 h.

## Week 3 (Sep 24–30) — convert
- Maintain volume but prioritise responding to live threads.
- Interview prep packets for every scheduled call.
- Follow-up #2 (final) on dead week-1 threads.

## Week 4 (Oct 1–9) — close
- Push scheduled interviews through to final rounds.
- Negotiate any offer; keep pipeline warm until signed.

## Honest target
First recruiter replies: realistically days 7–18 at this volume.
Interview(s) organised within 30 days: achievable if the daily 15–20 min happens every day and the resume/LinkedIn fixes land this week. An offer letter inside 30 days is possible but not something anyone can promise — it depends on employer timelines.
