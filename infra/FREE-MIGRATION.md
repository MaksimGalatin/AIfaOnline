# Бесплатная архитектура: бот+воркер на free e2-micro VM, Mini App на Cloud Run (min=0)

Итог: постоянный дренаж Cloud Run → ~$0. Бот+воркер крутятся на бесплатной VM, Mini App
(нужен HTTPS) остаётся на Cloud Run, который спит в простое (min=0) и просыпается по запросу.

## Шаги (выполнять в Cloud Shell, по порядку)

### 1) Перевести Cloud Run в режим "только Mini App" (бот там выключается)
```
gcloud run services update aifa-creativity --region=us-central1 \
  --update-env-vars=ROLE=web --min-instances=0
```

### 2) Создать бесплатную e2-micro VM (она запустит бота+воркер)
Из папки репозитория (где лежит infra/vm-startup.sh):
```
gcloud compute instances create aifa-bot \
  --project=project-72844ae8-a294-4048-980 --zone=us-central1-a \
  --machine-type=e2-micro --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=30GB --boot-disk-type=pd-standard \
  --service-account=aifa-autoclaw-sa-1-0@project-72844ae8-a294-4048-980.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --metadata-from-file=startup-script=infra/vm-startup.sh
```

### 3) Проверить (через ~3-5 мин)
```
gcloud compute ssh aifa-bot --zone=us-central1-a --command="sudo systemctl status aifa --no-pager; echo '---'; sudo tail -30 /var/log/aifa-startup.log"
```
Затем напиши боту в Telegram — должен ответить (с VM). Открой Mini App — отдаётся Cloud Run.

## Обновление после git push (теперь две цели)
- Mini App (Cloud Run): `bash infra/deploy.sh` как раньше (но добавь ROLE=web, min=0 — см. шаг 1).
- Бот (VM): пере-запусти startup: `gcloud compute ssh aifa-bot --zone=us-central1-a --command="sudo google_metadata_script_runner startup"`

## Откат (если что-то не так)
```
gcloud run services update aifa-creativity --region=us-central1 --remove-env-vars=ROLE --min-instances=1
gcloud compute instances delete aifa-bot --zone=us-central1-a -q
```
(Cloud Run снова поднимет бота, VM удалится.)
