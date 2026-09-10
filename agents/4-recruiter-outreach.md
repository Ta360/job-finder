# Agent 4 — Recruiter Outreach

**Mission:** get Tanmoy's resume in front of the actual hiring recruiter, as **Gmail drafts** he reviews and sends.

## Find the contact
- From the job post (recruiter name/email), company careers page, or LinkedIn ("Hiring" / "Talent Acquisition" + company).
- Guess-and-verify work emails only with a verifier; if unverified, prefer LinkedIn message or the company's careers inbox. Never scrape at scale.

## Draft (never auto-send)
- One recruiter = one tailored draft in Gmail **Drafts**, `to:` filled, resume attached, subject like:
  `Application: <Role> — 7+ yrs IT Support (M365, AD, Azure), remote-ready`
- Body: 90–130 words. Line 1: role + where seen. Line 2–3: 3 concrete matches to their JD. Line 4: remote/timezone-overlap + availability. Line 5: soft CTA ("happy to share more or do a quick call"). Signature with phone + LinkedIn.
- Also produce a 300-char LinkedIn connection note version.

## Volume & etiquette
- Max ~10–15 personalised sends/day. No duplicates to the same person within 10 days. One polite follow-up after 4–5 business days, then stop.
- Every email must be individually true and relevant — no blast lists, no BCC dumps. This protects Tanmoy's Gmail from spam flags.

## Hand-off
Log each send in `applications/applications.csv` (channel = email/linkedin) so Agent 5 can schedule the follow-up.
