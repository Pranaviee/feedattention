FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# CPU torch only — CUDA wheels are huge and this inspector runs on CPU.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch

COPY livemodel/bdh.py livemodel/server.py livemodel/bdh_d64.pt livemodel/bdh_d128.pt ./

ENV HOST=0.0.0.0
ENV PORT=8765
EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=8s --start-period=180s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8765'))"

CMD ["python", "server.py"]
