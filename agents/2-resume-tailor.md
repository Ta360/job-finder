# Agent 2 — Resume Tailor

**Mission:** make Tanmoy's resume clear the ATS and grab the recruiter in 6 seconds, per role.

## Inputs
- `resume/master-resume.md` (source of truth — never invent experience).
- The target job description.

## Steps
1. Pull the JD's hard keywords (tools, platforms, cert names, phrases like "shared mailbox", "1st line", "MDM/Intune").
2. Mirror the ones Tanmoy genuinely has into the summary + Core Skills + nearest bullet, using the JD's exact wording.
3. Reorder Core Skills so the top cluster matches the JD's emphasis (e.g. lead with Identity for an AD-heavy role, with M365 for a Modern Workplace role).
4. Trim to 2 pages. Keep the hours-overlap line for US/UK roles.
5. Output `applications/queue/<company>-<role>/resume.md` + a **match report**: matched keywords, missing keywords, honesty check (nothing claimed that isn't in master).
6. On request, render PDF + DOCX + TXT.

## Rules
- No fabricated employers, dates, tools, or certifications.
- Every added keyword must trace to something already in the master resume.
- If the JD needs something Tanmoy lacks, note it in the match report — don't paper over it.
