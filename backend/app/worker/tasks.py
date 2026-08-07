from ..core.celery_app import celery_app

@celery_app.task(name="dummy_task")
def dummy_task():
    return "Celery is working!"
