#!/bin/bash
# AIfa free e2-micro VM startup: runs bot + worker (polling). Mini App stays on Cloud Run.
set -e
exec > /var/log/aifa-startup.log 2>&1
echo "=== AIfa VM startup $(date) ==="
export DEBIAN_FRONTEND=noninteractive
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git ffmpeg fonts-dejavu-core
cd /opt && rm -rf aifa-works-bot-
git clone https://YOUR_GITHUB_TOKEN@github.com/MaksimGalatin/aifa-works-bot-.git aifa-works-bot-
cd aifa-works-bot-
npm install --workspaces --include-workspace-root
npm run build -w shared && npm run build -w bot && npm run build -w workers && npm run build -w api
# secrets from Secret Manager (attached SA has accessor); ADC for Vertex is automatic on GCE
SECRET(){ gcloud secrets versions access latest --secret="$1" 2>/dev/null; }
cat > /etc/aifa.env <<ENV
TELEGRAM_BOT_TOKEN=$(SECRET telegram-bot-token)
TELEGRAM_WEBHOOK_SECRET=$(SECRET telegram-webhook-secret)
DATABASE_URL=$(SECRET database-url)
GCP_PROJECT_ID=project-72844ae8-a294-4048-980
ADMIN_TG_IDS=7764531490
NOWPAYMENTS_API_KEY=unused
NOWPAYMENTS_IPN_SECRET=unused
PUBLIC_BASE_URL=https://aifa-creativity-kvuloffkna-uc.a.run.app
PORT=8080
NODE_ENV=production
ENV
cat > /etc/systemd/system/aifa.service <<SVC
[Unit]
Description=AIfa bot+worker
After=network-online.target
[Service]
EnvironmentFile=/etc/aifa.env
WorkingDirectory=/opt/aifa-works-bot-
ExecStart=/usr/bin/node api/dist/server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable aifa
systemctl restart aifa
echo "=== AIfa VM ready $(date) ==="
