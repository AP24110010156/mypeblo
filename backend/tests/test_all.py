import pytest
import io
import os
import json
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.services.artwork_service import validate_artwork
from app.db.seed import seed_database

# Use in-memory SQLite with StaticPool so threads share the exact same DB instance
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

# Helper to generate test images in memory
def create_test_image_bytes(width: int, height: int, format: str = "JPEG") -> bytes:
    img = Image.new("RGB", (width, height), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

# --- 1. Artwork Upload & Validation Tests ---
def test_validate_artwork_valid():
    poster_bytes = create_test_image_bytes(600, 900)
    res = validate_artwork("poster", poster_bytes, "poster.jpg")
    assert res["art_type"] == "poster"
    assert res["width"] == 600
    assert res["height"] == 900

def test_validate_artwork_wrong_aspect():
    bad_poster_bytes = create_test_image_bytes(600, 600)  # 1:1 instead of 2:3
    with pytest.raises(Exception) as exc_info:
        validate_artwork("poster", bad_poster_bytes, "bad_poster.jpg")
    assert "2:3 aspect ratio" in str(exc_info.value.detail)

def test_validate_artwork_too_large():
    large_bytes = b"0" * (205 * 1024)
    with pytest.raises(Exception) as exc_info:
        validate_artwork("banner", large_bytes, "huge.jpg")
    assert "too large" in str(exc_info.value.detail)


# --- 2. RBAC Roles Tests ---
def test_rbac_editor_access():
    headers = {"X-User-Role": "editor"}
    response = client.get("/admin/shows", headers=headers)
    assert response.status_code == 200

def test_rbac_editor_blocked_from_publish():
    headers = {"X-User-Role": "editor"}
    response = client.post("/admin/catalog/publish", headers=headers)
    assert response.status_code == 403
    assert "requires 'admin' role" in response.json()["detail"]

def test_rbac_admin_allowed_publish():
    headers = {"X-User-Role": "admin"}
    response = client.post("/admin/catalog/publish?force=true", headers=headers)
    assert response.status_code == 200
    data = response.json()
    print("PUBLISH RESPONSE:", data)
    assert data["status"] == "success"


# --- 3. Validation Report Tests ---
def test_validation_report():
    headers = {"X-User-Role": "editor"}
    response = client.get("/admin/validation-report", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "can_publish" in data
    assert "issues_by_type" in data
    assert "total_issues" in data


# --- 4. Catalog Search Tests ---
def test_catalog_search():
    admin_headers = {"X-User-Role": "admin"}
    pub_res = client.post("/admin/catalog/publish?force=true", headers=admin_headers)
    print("PUB RES SEARCH TEST:", pub_res.json())

    response = client.get("/catalog/search?q=Moti")
    print("SEARCH RES:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0


# --- 5. Health Check Test ---
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
