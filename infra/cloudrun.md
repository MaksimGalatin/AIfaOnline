# Cloud Run deploy (Phase 8)

- Service runs 24/7 on the $300 Free Trial credit. DB is external (Neon) to save credit.
- Secrets via **Secret Manager**, mounted as env: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
  DATABASE_URL, NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, GEMINI_API_KEY.
- Set Telegram webhook to: $PUBLIC_BASE_URL/webhook/telegram with secret_token.
- Min instances 1 (avoid cold starts dropping webhooks); concurrency tuned; HTTPS only.
- Watchdog + auto-restart + TG alerts to admin channel.

## Quick commands (fill project/region)
    gcloud run deploy aifa-api --source . --region us-central1 \
      --set-secrets=TELEGRAM_BOT_TOKEN=tg-token:latest,DATABASE_URL=db-url:latest
