import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app.core.database import get_db
from app.core.security import require_role
from app.core.storage import storage_backend
from app.models.schema import Show, Season, Episode, Artwork, PublishRun
from app.schemas.domain import (
    ShowCreate, ShowUpdate, ShowResponse,
    EpisodeCreate, EpisodeUpdate, EpisodeResponse,
    ValidationReportResponse, PublishRunResponse
)
from app.services.artwork_service import validate_artwork
from app.services.validation_service import generate_validation_report
from app.services.catalog_service import publish_catalog

router = APIRouter(prefix="/admin", tags=["Admin CMS"])

# --- Artwork Upload Endpoint ---
@router.post("/artwork/upload", dependencies=[Depends(require_role("editor"))])
async def upload_artwork(
    art_type: str = Form(...),
    episode_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Validates uploaded artwork specifications (aspect ratio, px dimensions, max 200 KB)
    and saves to storage. Rejects bad uploads with editor-friendly human-readable errors.
    """
    # Find target episode
    ep = db.query(Episode).filter(Episode.episode_id == episode_id).first()
    if not ep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Episode with ID '{episode_id}' not found."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Validate against artwork specs
    val_info = validate_artwork(art_type, file_bytes, file.filename or "upload.jpg")

    # Generate storage file key
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    key = f"uploads/{episode_id}_{val_info['art_type']}{ext}"

    # Save to storage abstraction
    content_type = file.content_type or "image/jpeg"
    file_url = storage_backend.save_file(key, file_bytes, content_type=content_type)

    # Upsert artwork record in DB
    existing_art = db.query(Artwork).filter(
        Artwork.episode_id == ep.id,
        Artwork.art_type == val_info["art_type"]
    ).first()

    if existing_art:
        existing_art.file_path = key
        existing_art.url = file_url
        existing_art.width = val_info["width"]
        existing_art.height = val_info["height"]
        existing_art.size_bytes = val_info["size_bytes"]
    else:
        existing_art = Artwork(
            episode_id=ep.id,
            art_type=val_info["art_type"],
            file_path=key,
            url=file_url,
            width=val_info["width"],
            height=val_info["height"],
            size_bytes=val_info["size_bytes"]
        )
        db.add(existing_art)

    db.commit()

    return {
        "status": "success",
        "message": f"{val_info['art_type'].capitalize()} artwork uploaded successfully.",
        "url": file_url,
        "spec": val_info
    }


# --- Show CRUD Endpoints ---
@router.get("/shows", dependencies=[Depends(require_role("editor"))])
def list_shows(
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Show)

    if section:
        query = query.filter(Show.section == section)
    if q:
        query = query.filter(Show.title.ilike(f"%{q}%"))

    total = query.count()
    shows = query.order_by(Show.title.asc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "shows": shows
    }

@router.post("/shows", dependencies=[Depends(require_role("editor"))])
def create_show(show_in: ShowCreate, db: Session = Depends(get_db)):
    existing = db.query(Show).filter(Show.slug == show_in.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Show with slug '{show_in.slug}' already exists."
        )

    show = Show(
        title=show_in.title,
        slug=show_in.slug,
        section=show_in.section,
        categories=show_in.categories,
        synopsis=show_in.synopsis
    )
    db.add(show)
    db.commit()
    db.refresh(show)
    return show

@router.put("/shows/{show_id}", dependencies=[Depends(require_role("editor"))])
def update_show(show_id: int, show_in: ShowUpdate, db: Session = Depends(get_db)):
    show = db.query(Show).filter(Show.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    update_data = show_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(show, field, value)

    db.commit()
    db.refresh(show)
    return show


# --- Episode CRUD Endpoints ---
@router.get("/episodes", dependencies=[Depends(require_role("editor"))])
def list_episodes(
    section: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    language: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Episode).join(Season).join(Show)

    if section:
        query = query.filter(Show.section == section)
    if status_filter:
        query = query.filter(Episode.status == status_filter)
    if language:
        query = query.filter(Episode.language == language)
    if q:
        query = query.filter(
            or_(
                Episode.episode_title.ilike(f"%{q}%"),
                Show.title.ilike(f"%{q}%"),
                Episode.episode_id.ilike(f"%{q}%")
            )
        )

    total = query.count()
    episodes = query.order_by(Show.title.asc(), Season.season_number.asc(), Episode.episode_number.asc())\
                     .offset((page - 1) * limit).limit(limit).all()

    # Format result list
    result_list = []
    for ep in episodes:
        show = ep.season.show
        arts = [
            {
                "id": a.id,
                "episode_id": a.episode_id,
                "art_type": a.art_type,
                "url": a.url,
                "file_path": a.file_path,
                "width": a.width,
                "height": a.height,
                "size_bytes": a.size_bytes,
                "uploaded_at": a.uploaded_at
            }
            for a in ep.artworks
        ]
        result_list.append({
            "id": ep.id,
            "episode_id": ep.episode_id,
            "season_id": ep.season_id,
            "season_number": ep.season.season_number,
            "episode_number": ep.episode_number,
            "episode_title": ep.episode_title,
            "duration_seconds": ep.duration_seconds,
            "language": ep.language,
            "content_group": ep.content_group,
            "status": ep.status,
            "show_id": show.id,
            "show_title": show.title,
            "section": show.section,
            "categories": show.categories,
            "artworks": arts,
            "created_at": ep.created_at,
            "updated_at": ep.updated_at
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "episodes": result_list
    }

@router.put("/episodes/{episode_id}", dependencies=[Depends(require_role("editor"))])
def update_episode(episode_id: str, ep_in: EpisodeUpdate, db: Session = Depends(get_db)):
    ep = db.query(Episode).filter(Episode.episode_id == episode_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")

    # If updating content_group / language, check uniqueness constraint
    new_cg = ep_in.content_group or ep.content_group
    new_lang = ep_in.language or ep.language
    if (new_cg != ep.content_group or new_lang != ep.language):
        dup = db.query(Episode).filter(
            Episode.content_group == new_cg,
            Episode.language == new_lang,
            Episode.id != ep.id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Combination (content_group='{new_cg}', language='{new_lang}') already exists on episode {dup.episode_id}."
            )

    update_data = ep_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "season_number" and value is not None:
            # Check or create season
            show_id = ep.season.show_id
            season = db.query(Season).filter(Season.show_id == show_id, Season.season_number == value).first()
            if not season:
                season = Season(show_id=show_id, season_number=value)
                db.add(season)
                db.flush()
            ep.season_id = season.id
        else:
            setattr(ep, field, value)

    db.commit()
    db.refresh(ep)
    return {"status": "success", "message": f"Episode {ep.episode_id} updated."}


# --- Validation Report Endpoint ---
@router.get("/validation-report", response_model=ValidationReportResponse, dependencies=[Depends(require_role("editor"))])
def get_validation_report(db: Session = Depends(get_db)):
    """
    Returns all issues currently blocking publish, grouped so content editors
    can review and resolve them without engineering assistance.
    """
    return generate_validation_report(db)


# --- Publish Catalogue Endpoint (Admin Only) ---
@router.post("/catalog/publish", dependencies=[Depends(require_role("admin"))])
def trigger_catalog_publish(
    published_by: str = "admin",
    force: bool = False,
    db: Session = Depends(get_db)
):
    """
    Enforces 'admin' role. Re-validates data, collapses language variants,
    builds JSON payload, and performs an ATOMIC publish write.
    """
    return publish_catalog(db=db, published_by=published_by, force=force)

@router.get("/catalog/publish/history", response_model=List[PublishRunResponse], dependencies=[Depends(require_role("editor"))])
def list_publish_history(db: Session = Depends(get_db)):
    """Returns past publish run records."""
    return db.query(PublishRun).order_by(PublishRun.published_at.desc()).limit(50).all()
