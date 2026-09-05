# Peblo TV Mini — Full-Stack Platform Engineering Challenge

> **CMS Upload ──► API (FastAPI + Postgres) ──► Publish Job ──► catalogue.json in Storage ──► Viewer UI (Netflix-style)**

A full-stack streaming platform engine built with **Python (FastAPI + SQLAlchemy)** and **React + TypeScript (Vite + TanStack Query)** for Peblo TV.

---

## 🚀 Quick Start & How to Run

### Option 1: Run with Docker Compose (Recommended)
Brings up PostgreSQL database, FastAPI API server, CMS UI, and Viewer UI simultaneously:

```bash
# From repository root:
docker-compose up --build
```

- **Viewer Browse UI**: [http://localhost:5174](http://localhost:5174)
- **Internal CMS UI**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Option 2: Run Locally (Development Setup)

#### 1. Backend (FastAPI + SQLite/Postgres)
```bash
# From project root — pytest.ini configures PYTHONPATH automatically
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*Alternatively, from the `backend/` directory: `python app/main.py`*
*The database automatically initializes and seeds from `data/seed_shows.json` on startup.*

To run tests (from the **project root** — pytest.ini auto-configures `pythonpath = backend`):
```bash
python -m pytest backend/tests/ -v
```

#### 2. Internal CMS UI (React + TypeScript)
```bash
cd cms-ui
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). Use the header toggle to switch active role between **Editor** and **Admin**.

#### 3. Viewer Browse UI (React + TypeScript)
```bash
cd viewer-ui
npm install
npm run dev
```
Open [http://localhost:5174](http://localhost:5174).

---

## 🔍 Part A & B — Key System Components & Features

### 1. Artwork Upload & Validation Engine
- Enforces specs defined in `reference.json`:
  - **Poster**: `2:3` aspect ratio (`~600×900 px`), max `200 KB`.
  - **Banner**: `16:9` aspect ratio (`~1280×720 px`), max `200 KB`.
  - **Thumbnail**: `16:9` aspect ratio (`~640×360 px`), max `200 KB`.
- Image inspection via Pillow (`PIL`). Rejects invalid aspect ratios or oversized files with **non-technical editor-friendly error messages** (e.g. *"Uploaded banner is 1920x1080 px. Banners must have a 16:9 aspect ratio (~1280x720 px) and under 200 KB"*).

### 2. Role-Based Access Control (RBAC)
- Enforces role permissions via FastAPI dependency injection (`require_role`):
  - **Editor**: Full CRUD access for shows, seasons, episodes, artwork uploads, and viewing validation reports.
  - **Admin**: Full CRUD + exclusive permission to trigger `POST /admin/catalog/publish`.
- If an `editor` attempts to hit `/admin/catalog/publish`, the API returns **HTTP 403 Forbidden**.
- The CMS UI dynamically disables the publish button when logged in as an `editor`.

### 3. Validation Report (`GET /admin/validation-report`)
Surfaces all defects currently blocking catalogue publishing:
- Published episodes missing required artwork (`poster`, `banner`, `thumbnail`).
- Published episodes missing `duration_seconds`.
- Published shows missing `section`.
- Duplicate `(content_group, language)` entries.

---

## 📝 Part E — Written Technical Reasoning (Trade-offs & Architecture)

### 1. How publishing is made atomic — and what happens if the process dies mid-publish
- **Atomic Mechanism**: We write the freshly generated JSON payload to a temporary file (`pub_XXXX.tmp`) in the target storage directory first, ensuring bytes are completely flushed and fsynced to disk. Once written, we execute an atomic replace (`os.replace` on POSIX/Windows or a single S3 `put_object` in R2).
- **Failure Resilience**: If the publish script dies mid-execution (e.g. OOM, network disruption, crash), the uncommitted temporary file is discarded or cleaned up. Readers fetching `catalogue.json` continuously receive the last intact, fully-validated catalogue. The aborted run is logged in the `publish_runs` database table with outcome `failed` and the exact error traceback.

### 2. Storage Abstraction: Moving from local disk to Cloudflare R2
- The backend relies on an abstract interface `BaseStorageBackend` (`app/core/storage.py`) providing `save_file`, `save_file_atomically`, `get_file`, and `delete_file`.
- To swap from `LocalStorageBackend` to `CloudflareR2StorageBackend`, only **one class configuration changes**: setting environment variable `STORAGE_TYPE=r2`. The R2 backend wraps `boto3` pointing to Cloudflare's S3-compatible API endpoint (`https://<account_id>.r2.cloudflarestorage.com`), requiring zero modifications to business logic or API endpoints.

### 3. Search: Implementation, scale limits, and future roadmap
- **Current Implementation**: `/catalog/search` evaluates composite filters (`q`, `category`, `language`, `section`). It matches `q` against show titles, episode titles, and category tags.
- **Scale Limits**: This works in sub-10ms for catalogues up to ~10,000 episodes (~5 MB JSON). At 100,000+ episodes (50+ MB JSON payload), reading and deserializing the catalogue per search request will consume high CPU and memory, causing query latency spikes.
- **Next Steps for Scale**:
  1. **PostgreSQL Full-Text Search (FTS)**: Utilize PostgreSQL `tsvector` and GIN indexes for fuzzy matching with `pg_trgm`.
  2. **Dedicated Search Index**: Stream catalog updates via CDC (Change Data Capture) or publish Webhooks into **Meilisearch** or **Algolia** for typo-tolerant, sub-5ms search across millions of kid-facing episodes.

### 4. Why serve a pre-published catalogue file vs querying the database per request?
- **Why Serve Pre-Published static `catalogue.json`**:
  - **High Availability & CDN Caching**: Static JSON files can be cached at the Cloudflare Edge network worldwide, delivering **sub-10ms latency** to millions of concurrent children without touching the backend DB.
  - **Zero Database Degradation**: Avoids expensive N+1 SQL joins (`shows -> seasons -> episodes -> artworks -> variants`) on every viewer page view.
- **Where this choice bites us**:
  - **Eventual Consistency**: Content changes made in the CMS do not immediately reflect in the viewer UI until an explicit publish run is executed.
  - **Cache Invalidation Costs**: Requires purging CDN edge cache tags upon publish.

### 5. What was left out and why, and AI tool usage
- **What was left out & why**:
  - *Full OAuth2/SAML Server*: Simplified to header/token role authorization (`X-User-Role`) to focus engineering time on data modeling, atomic publishing, image validation, and UI operability.
  - *MinIO Container*: Used lightweight local storage abstraction + Cloudflare R2 class implementation to keep `docker-compose up` fast and lightweight.
- **AI Tool Usage**: Used AI coding assistant for boilerplate template generation and initial seed dataset anomaly scanning. AI recommendations for non-atomic file overwriting were **rejected** in favor of `os.replace` temporary file atomic swapping.

---

## 🛠️ Operability, Health & Alerting

### Health Endpoint (`GET /health`)
Returns JSON status checking both Database connection and Storage read availability:
```json
{
  "status": "healthy",
  "database": "ok",
  "storage": "ok"
}
```

### 🚨 Key Alerting Metric: Catalogue Freshness SLA & Publish Failure Spike
- **Metric to Alert On**: `publish_run_failures_total > 2` or `catalogue_age_hours > 24`.
- **Reasoning**: If content editors attempt to publish and experience repeated failures, or if the published catalogue file has not updated in over 24 hours while draft changes exist, it indicates a critical storage pipeline failure or unhandled seed corruption. Alerting on publish outcome ensures content team workflows are never silently blocked.

---

## 📊 Time Spent Breakdown (~7.5 Hours Total)
| Component | Hours | Key Deliverables |
|---|---|---|
| **Data Analysis & Backend** | 2.5 hrs | Schema design, artwork validator, validation report, atomic publisher, unit tests |
| **Internal CMS UI** | 2.0 hrs | Show/episode manager, 3 artwork slots with preview, publish dashboard & RBAC |
| **Viewer Browse UI** | 1.5 hrs | Netflix-style dark home, section rows, Season 0 trailer separation, language pills |
| **Pipeline & Operability** | 1.0 hr | Docker Compose, GitHub Actions CI/CD, health check, secrets management |
| **Documentation & README** | 0.5 hr | Technical written prompts, trade-off reasoning, architecture diagrams |
