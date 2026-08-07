import os
from celery import Celery

# Pobieranie URL do Redisa z env, domyślnie uderza do localhosta (lub kontenera redis)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "civictechsejm_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Wymusza szukanie tasków w naszym projekcie
celery_app.autodiscover_tasks(["app.worker"])

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Warsaw",
    enable_utc=True,
)
