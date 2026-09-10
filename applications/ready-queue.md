# Ready to submit — prepared packets

Each folder in `queue/` has a tailored resume + everything you need. You do the final submit.

| Role | Company | Pay | Fit | Folder | Apply URL |
|------|---------|-----|-----|--------|-----------|
| IT Helpdesk Technician | Porch | ₹6.9–9.7L | ~90% | `queue/porch-it-helpdesk-technician/` | https://porch.wd1.myworkdayjobs.com/careers/job/in-remote/it-helpdesk-technician_jr101501 |
| IT Support Lead | Porch | ₹11–15L | ~65% (stretch) | `queue/porch-it-support-lead/` | https://porch.wd1.myworkdayjobs.com/careers/job/in-remote/it-support-lead_jr101484 |
| Help Desk Engineer | Anovia | ₹3–4.5L | ~80% (backup) | `queue/anovia-help-desk-engineer/` | https://anovia.breezy.hr/p/f62c1185c36e-help-desk-engineer |

## Resumes are ready ✅
Each folder now has **`resume.pdf`** and **`resume.docx`** (generated from `resume.md`). LinkedIn URL is in.
Upload the **PDF** to Workday/Breezy; keep the **DOCX** for any portal that asks for an editable copy.

Open one caveat (not a blocker): the Cisco line shows as *coursework* under "Education & Training". If you actually
passed CCNA/CCNP/CCIE exams, tell me and I'll regenerate with a real Certifications line.

Regenerate anytime after editing a `resume.md`:  `python scripts/build_resumes.py`

## After each submit
Add a row to `applications.csv` (or tell me): `date,company,role,location_type,source,channel,status` → e.g.
`2026-09-11,Porch,IT Helpdesk Technician,Remote-India,RemoteRocketship,application,applied`
Set `next_action=follow-up`, `next_action_date` = +5 business days. Then the dashboard and Agent 5 pick it up.
