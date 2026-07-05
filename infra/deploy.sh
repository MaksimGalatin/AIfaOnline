#!/usr/bin/env bash
# Deploy AIfa Creativity to Cloud Run. Run inside Google Cloud Shell.
# Secrets read from env vars exported BEFORE running (never committed).
set -euo pipefail

PROJECT="project-72844ae8-a294-4048-980"
REGION="us-central1"
SERVICE="aifa-creativity"
SA="aifa-autoclaw-sa-1-0@${PROJECT}.iam.gserviceaccount.com"

req=(TELEGRAM_BOT_TOKEN TELEGRAM_WEBHOOK_SECRET DATABASE_URL NOWPAYMENTS_API_KEY NOWPAYMENTS_IPN_SECRET)
for v in "${req[@]}"; do [ -n "${!v:-}" ] || { echo "Missing env: $v"; exit 1; }; done

gcloud config set project "$PROJECT"
echo ">> enabling APIs"
gcloud services enable run.googleapis.com aiplatform.googleapis.com texttospeech.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

echo ">> secrets"
put_secret(){ gcloud secrets create "$1" --replication-policy=automatic 2>/dev/null || true; printf "%s" "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null; }
put_secret telegram-bot-token       "$TELEGRAM_BOT_TOKEN"
put_secret telegram-webhook-secret  "$TELEGRAM_WEBHOOK_SECRET"
put_secret database-url             "$DATABASE_URL"
put_secret nowpayments-api-key      "$NOWPAYMENTS_API_KEY"
put_secret nowpayments-ipn-secret   "$NOWPAYMENTS_IPN_SECRET"

echo ">> SA roles (Vertex + read secrets)"
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/aiplatform.user" --condition=None -q >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor" --condition=None -q >/dev/null

echo ">> grant Cloud Build/Compute SA the roles it needs to build from source"
PNUM=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
BUILD_SA="${PNUM}-compute@developer.gserviceaccount.com"
for ROLE in roles/cloudbuild.builds.builder roles/storage.objectViewer roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$BUILD_SA" --role="$ROLE" --condition=None -q >/dev/null
done

echo ">> deploy (private ingress first — robust against org policy)"
gcloud run deploy "$SERVICE" \
  --source . --region "$REGION" --quiet \
  --service-account "$SA" \
  --min-instances 1 --max-instances 1 --no-cpu-throttling --memory 1Gi --timeout 600 \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=${PROJECT},TELEGRAM_BOT_USERNAME=AIfaCreativityBot,ADMIN_TG_IDS=7764531490" \
  --set-secrets "TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,TELEGRAM_WEBHOOK_SECRET=telegram-webhook-secret:latest,DATABASE_URL=database-url:latest,NOWPAYMENTS_API_KEY=nowpayments-api-key:latest,NOWPAYMENTS_IPN_SECRET=nowpayments-ipn-secret:latest"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo ">> service URL: $URL"

echo ">> set PUBLIC_BASE_URL for NOWPayments IPN callbacks"
gcloud run services update "$SERVICE" --region "$REGION" --quiet \
  --update-env-vars "PUBLIC_BASE_URL=${URL}"

echo ">> try public ingress for NOWPayments IPN (best-effort; org policy may block allUsers)"
gcloud run services add-iam-policy-binding "$SERVICE" --region "$REGION" \
  --member="allUsers" --role="roles/run.invoker" -q || \
  echo "   NOTE: allUsers blocked by org policy. Bot (polling) + Lyria still work. For crypto IPN we will add a workaround."

echo ""
echo "=== DONE. Service URL: $URL ==="
echo "Bot is live (polling). Message @AIfaCreativityBot to test."
