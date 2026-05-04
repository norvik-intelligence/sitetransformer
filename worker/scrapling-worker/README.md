# Scrapling Worker

Optionaler Python-Worker fuer starke Crawls ausserhalb von Vercel.

## Warum separat?

Vercel ist gut fuer Next.js, aber nicht ideal fuer lange Browser-/Stealth-Crawls. Dieser Worker kann auf Railway, Render, Fly.io, Docker VPS oder einem eigenen Server laufen.

## Env in Vercel

```env
SCRAPLING_WORKER_URL=https://dein-worker.example.com
SCRAPLING_WORKER_TOKEN=optional-secret
```

## Start lokal

```bash
cd worker/scrapling-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
