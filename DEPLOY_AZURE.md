# Deploy — Job Finder web app

Single container image (`app/Dockerfile`): the Express API static-serves the built React SPA and exposes the REST API on port **4200**.

## Local check

```bash
cd app
docker build -t job-finder .
docker run --rm -p 4200:4200 -v job-finder-data:/app/backend/data job-finder
```

Open http://localhost:4200.

## Azure Container Apps (same pattern as the stocks project)

```bash
RG=job-finder-rg
LOC=eastus
ACR=jobfinderacr$RANDOM
APP=job-finder

az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic --admin-enabled true
az acr build -r $ACR -t job-finder:latest ./app

az containerapp env create -n job-finder-env -g $RG -l $LOC
az containerapp create -n $APP -g $RG \
  --environment job-finder-env \
  --image $ACR.azurecr.io/job-finder:latest \
  --registry-server $ACR.azurecr.io \
  --target-port 4200 --ingress external \
  --min-replicas 1 --max-replicas 1 \
  --cpu 0.5 --memory 1.0Gi
```

## Persistence note

SQLite writes to `/app/backend/data`. Container Apps' local disk is **ephemeral** — a revision restart wipes it. For durable data mount an Azure Files share at `/app/backend/data` (`az containerapp env storage set` + `--volume`/`--volume-mount`), or point `DATA_DIR` at a mounted path. For a personal tool that you also back up via the `applications.csv` export, ephemeral + periodic CSV import is acceptable.

## Auth

There is **no authentication** on this app. If you deploy it publicly, put it behind Container Apps auth (`az containerapp auth`) or keep `--ingress internal` and reach it over VPN. Don't expose your job-search data unprotected.
