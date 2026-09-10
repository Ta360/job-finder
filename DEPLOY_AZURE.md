# Deploy — Job Finder web app (Azure Container Apps)

Single container image (`app/Dockerfile`): Express API serves the built React SPA on port **4200**.

## Live deployment (created 2026-09-10)

| Thing | Value |
|---|---|
| URL | https://job-finder.lemonmushroom-294dede7.eastus.azurecontainerapps.io |
| Resource group | `job-finder-rg` (eastus) |
| Registry | `jobfinderacr29624.azurecr.io` |
| Environment | `job-finder-env` |
| Container app | `job-finder` |
| Scale | min 0 / max 1 · 0.5 vCPU · 1.0 GiB (scales to zero when idle) |
| Env vars | `NODE_ENV=production`, `REQUIRE_AUTH=1`, `ALLOWED_EMAILS=tanmoy1.sarkar@gmail.com` |

`REQUIRE_AUTH=1` means every request except `/api/health` needs an Azure Easy Auth
principal, and only `ALLOWED_EMAILS` accounts pass. Until Easy Auth is wired (below),
the app returns **401 for everything** — locked, not yet usable.

## Rebuild + redeploy after code changes

```bash
export PYTHONIOENCODING=utf-8 PYTHONUTF8=1   # avoids an az-cli unicode crash on Windows
az acr build -r jobfinderacr29624 -t job-finder:latest "C:/Users/TANMOY SARKAR/Desktop/Job Finder/app"
az containerapp update -n job-finder -g job-finder-rg --image jobfinderacr29624.azurecr.io/job-finder:latest
```

## Google sign-in (Azure Easy Auth) — CONFIGURED

Done 2026-09-10. Visiting the URL in a browser now 302-redirects to Google;
after sign-in, the app's own middleware checks the email against `ALLOWED_EMAILS`
(`tanmoy1.sarkar@gmail.com`). API-style requests without a session get 401.

- Web OAuth client: `829413738578-k0f0nf9v5ma48ddr1i64jfop0fkevkab.apps.googleusercontent.com`
  (type: Web application, in the "Google Calendar API for job" project)
- Redirect URI registered:
  `https://job-finder.lemonmushroom-294dede7.eastus.azurecontainerapps.io/.auth/login/google/callback`
- Secret stored as Container App secret `google-provider-authentication-secret`

### Rotate the client secret

In Google Cloud → Clients → `job-finder-web` → **Reset secret**, then:

```bash
az containerapp secret set -n job-finder -g job-finder-rg \
  --secrets "google-provider-authentication-secret=GOCSPX-<new>"
az containerapp update -n job-finder -g job-finder-rg   # new revision picks it up
```

### Re-apply auth from scratch (reference)

```bash
az containerapp auth google update -n job-finder -g job-finder-rg \
  --client-id <WEB_CLIENT_ID> --client-secret <WEB_CLIENT_SECRET> --yes
az containerapp auth update -n job-finder -g job-finder-rg \
  --enabled true --unauthenticated-client-action RedirectToLoginPage --redirect-provider google
```

## Cloud parity env vars (set on the container app)

| Var | Value | Enables |
|---|---|---|
| `DIGEST_REMOTE_URL` | GitHub raw of `job-search/digest-latest.md` | Digest tab reads from GitHub |
| `IMPORT_CSV_REMOTE_URL` | GitHub raw of `applications/applications.csv` | "Import from repo / cloud" button |
| `GOOGLE_WEB_CLIENT_ID` | `829413738578-k0f0nf9v…kevkab...` | browser Google Calendar connect |
| `GOOGLE_WEB_CLIENT_SECRET` | `secretref:google-provider-authentication-secret` | ″ |

### Google Calendar in the cloud — one-time

Add this redirect URI to the **`job-finder-web`** OAuth client (Google Cloud → Clients):

```
https://job-finder.lemonmushroom-294dede7.eastus.azurecontainerapps.io/api/google/callback
```

Then on the cloud dashboard → Calendar tab → **Connect Google Calendar** → approve.
The refresh token is stored in the DB (`settings.google_token`), so it survives
revision restarts. The Calendar dropdown / seed-cadence / event CRUD then work in the cloud.

### CSV in the cloud

Dashboard → **Upload CSV** picks a file from your machine and imports it, or
**Import from repo / cloud** pulls `applications.csv` from GitHub. Both also work locally.

## Notes

- **The cloud DB is ephemeral, but it now re-seeds itself.** On startup an empty DB
  hydrates from `IMPORT_CSV_REMOTE_URL` (applications.csv) and `OUTREACH_REMOTE_URL`
  (outreach.csv) on GitHub, so a redeploy / cold start comes back with the tracked
  applications and outreach instead of blank. Still lost on reset: the Google Calendar
  connection + stored calendar id, and any rows added *only* on the cloud (not written
  back to the CSVs). **Keep `applications/applications.csv` and `applications/outreach.csv`
  current in git** — they are the cloud's source of truth. The local instance (real
  filesystem) is authoritative for everything.
  - Azure Files was tried as a persistent mount (`jfdata` share on `jobfinderstore6877`,
    mounted at `/data`). `node:sqlite` fails to activate on the SMB mount even as root
    with `journal_mode=DELETE`, so `DATA_DIR` is left unset and the share is unused.
    Safe to delete `jfdata` env storage + the `jobfinderstore6877` account.
  - For durable cloud state, the real fix is swapping SQLite for **Azure Database for
    PostgreSQL Flexible Server** (~$13–15/mo) — not done.
  - Cheaper stopgap: `--min-replicas 1` keeps one replica warm so the ephemeral disk
    survives idle (only a redeploy/platform migration then resets it). ~$13–18/mo always-on.
- Treat the **local** instance (`localhost:4200`, real filesystem persistence) as
  authoritative for the Google Calendar link and any manually-tracked rows.
- **Tear down:** `az group delete -n job-finder-rg --yes --no-wait`
- **Cost:** ACR Basic ~$5/mo; Container Apps ~free at idle (scale-to-zero), pennies/day when used.
