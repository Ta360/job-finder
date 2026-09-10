# Google Calendar API — one-time setup

This lets the Job Finder app create and manage its **own** Google calendar
(`POST /api/calendar` → `calendars.insert`), which the Claude connector can't do.

You do the Google Cloud part once (~15–20 min of clicking). After that the app
holds a refresh token and works on its own.

---

## 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/> → project picker (top bar) → **New Project**.
2. Name it `job-finder` → **Create** → select it.

## 2. Enable the Calendar API

1. <https://console.cloud.google.com/apis/library/calendar-json.googleapis.com>
2. **Enable**.

## 3. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** → **Create**.
3. App name `Job Finder`, user support email = your email, developer email = your email → **Save and Continue**.
4. **Scopes** → **Add or remove scopes** → filter for *Calendar API* → tick
   `.../auth/calendar` (See, edit, share, and permanently delete all the calendars) → **Update** → **Save and Continue**.
5. **Test users** → **Add users** → add `tanmoy1.sarkar@gmail.com` → **Save and Continue**.
   (Leaving the app in "Testing" is fine — test users work indefinitely for your own use.)

## 4. Create the OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Desktop app**. Name: `job-finder-cli`.
3. **Create** → **Download JSON**.
4. Save that file as:

   ```
   C:\Users\TANMOY SARKAR\Desktop\Job Finder\app\backend\data\google-credentials.json
   ```

   (The `data/` folder is created on first server run. It's git-ignored.)

## 5. Authorise (one time)

From `C:\Users\TANMOY SARKAR\Desktop\Job Finder\app`:

```bash
npm run gcal-auth
```

It opens your browser → pick your Google account → "Google hasn't verified this app"
→ **Advanced → Go to Job Finder (unsafe)** (it's your own app) → **Allow**.
The terminal prints `✔ Connected` and writes `data/google-token.json`.

## 6. Use it

- Restart the app (`npm run dev` or the prod server).
- Open the dashboard → **Calendar** tab → **Google Calendar — connected**.
- Click **Create "Job Finder" calendar**, then **Add the 3 recurring holds**.
- Or via API:

  ```bash
  curl -X POST http://localhost:4200/api/calendar
  curl -X POST http://localhost:4200/api/calendar/seed-cadence
  ```

## Endpoints added

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/google/status` | credentials present? connected? which calendar id? |
| POST | `/api/calendar` | create the dedicated calendar (idempotent; `{"force":true}` to remake) |
| POST | `/api/calendar/seed-cadence` | add the 3 recurring Job Finder holds |
| GET | `/api/calendar/google-events` | upcoming events on the Job Finder calendar |
| POST | `/api/calendar/google-events` | add an event `{summary,start,end,description?,recurrence?,reminderMinutes?}` |
| DELETE | `/api/calendar/google-events/:id` | remove an event |

## Files (all git-ignored)

- `app/backend/data/google-credentials.json` — your OAuth client secret
- `app/backend/data/google-token.json` — the refresh token the app uses

Never commit or share these. To revoke: delete `google-token.json` and remove the
app at <https://myaccount.google.com/permissions>.
