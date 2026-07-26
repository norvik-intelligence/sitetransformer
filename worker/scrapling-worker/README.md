# Scrapy Worker

Optionaler Python-Worker für größere Crawls außerhalb von Vercel. Der Worker nutzt Scrapy und schützt öffentliche Installationen vor privaten Netzwerkzielen, unbeschränkten Redirects und unbeschränkten Crawl-Parametern.

## Warum separat?

Vercel ist gut fuer Next.js, aber nicht ideal fuer lange Browser-/Stealth-Crawls. Dieser Worker kann auf Railway, Render, Fly.io, Docker VPS oder einem eigenen Server laufen.

## Env in Vercel

```env
SCRAPY_WORKER_URL=https://dein-worker.example.com
SCRAPY_WORKER_TOKEN=ein-langes-zufälliges-secret
```

Der Token sollte bei jeder öffentlich erreichbaren Installation gesetzt sein.

## Start lokal

```bash
cd worker/scrapling-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
