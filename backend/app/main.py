import os
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api import admin, catalog, health
from app.db.seed import seed_database

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for CMS UI and Viewer UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

# Mount static file directories for local storage & sample assets
storage_dir = Path(settings.STORAGE_BASE_DIR).resolve()
storage_dir.mkdir(parents=True, exist_ok=True)
(storage_dir / "uploads").mkdir(parents=True, exist_ok=True)
(storage_dir / "published").mkdir(parents=True, exist_ok=True)

app.mount("/storage", StaticFiles(directory=str(storage_dir)), name="storage")

sample_assets_dir = Path(__file__).resolve().parent.parent.parent / "sample_assets"
if sample_assets_dir.exists():
    app.mount("/sample_assets", StaticFiles(directory=str(sample_assets_dir)), name="sample_assets")

# Include API routers
app.include_router(health.router)
app.include_router(admin.router)
app.include_router(catalog.router)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        print(f"Startup seed error: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "catalog": "/catalog"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
