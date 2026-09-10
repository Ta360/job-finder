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

## Enable Google sign-in (Azure Easy Auth)

1. In the **same Google Cloud project** ("Google Calendar API for job") →
   **Clients → Create client → Web application**, name `job-finder-web`.
2. **Authorised redirect URIs** → add:
   ```
   https://job-finder.lemonmushroom-294dede7.eastus.azurecontainerapps.io/.auth/login/google/callback
   ```
3. Create → copy the **Client ID** and **Client secret**.
4. Run:

   ```bash
   az containerapp auth google update -n job-finder -g job-finder-rg \
     --client-id  <WEB_CLIENT_ID> \
     --client-secret <WEB_CLIENT_SECRET> \
     --yes
   az containerapp auth update -n job-finder -g job-finder-rg \
     --enabled true \
     --unauthenticated-client-action RedirectToLoginPage \
     --redirect-provider google
   ```

Now visiting the URL redirects to Google; after sign-in, the app's own middleware
checks the email against `ALLOWED_EMAILS`.

## Notes

- **Google Calendar feature is dormant in the cloud.** It uses a desktop-OAuth
  refresh token stored in `app/backend/data/` (git-ignored, not in the image, and the
  container disk is ephemeral). The Calendar tab works on the **local** instance only.
  To enable it in the cloud you'd move the token store to a mounted Azure Files share
  and switch to a web OAuth flow.
- **SQLite data is ephemeral** — a revision restart resets the DB. Fine for a personal
  tracker you also keep in `applications.csv`; for durability mount Azure Files at
  `/app/backend/data`.
- **Tear down:** `az group delete -n job-finder-rg --yes --no-wait`
- **Cost:** ACR Basic ~$5/mo; Container Apps ~free at idle (scale-to-zero), pennies/day when used.
