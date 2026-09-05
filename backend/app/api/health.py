from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.storage import storage_backend

router = APIRouter(tags=["Health & Monitoring"])

@router.get("/health")
def check_health(db: Session = Depends(get_db)):
    """
    Health Endpoint:
    Checks database connection and storage read availability.
    """
    health_status = {
        "status": "healthy",
        "database": "ok",
        "storage": "ok"
    }
    http_code = status.HTTP_200_OK

    # 1. Test DB connection
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
        http_code = status.HTTP_503_SERVICE_UNAVAILABLE

    # 2. Test Storage read capability
    try:
        # Check if storage directory / bucket is accessible
        _ = storage_backend.get_url("health_test.txt")
    except Exception as e:
        health_status["storage"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
        http_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        content=str(health_status).replace("'", '"'),
        status_code=http_code,
        media_type="application/json"
    )
