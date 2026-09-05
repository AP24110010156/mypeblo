import json
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app.core.database import get_db
from app.core.storage import storage_backend
from app.models.schema import Show, Season, Episode, Artwork

router = APIRouter(prefix="/catalog", tags=["Viewer Catalog"])

@router.get("")
def get_published_catalog(db: Session = Depends(get_db)):
    """
    Primary Viewer Catalogue endpoint. Reads and serves the published catalogue.json
    directly from storage abstraction.
    """
    catalog_bytes = storage_backend.get_file("published/catalogue.json")
    
    if not catalog_bytes:
        from app.services.catalog_service import publish_catalog
        try:
            publish_catalog(db=db, published_by="system", force=True)
            catalog_bytes = storage_backend.get_file("published/catalogue.json")
        except Exception:
            raise HTTPException(status_code=404, detail="No published catalogue found.")

    return Response(content=catalog_bytes, media_type="application/json")


@router.get("/search")
def search_published_catalog(
    q: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    section: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Composite Search Endpoint:
    q matches show title, episode title, and category; all filters compose.
    Reads from published catalogue or DB query fallback.
    """
    catalog_bytes = storage_backend.get_file("published/catalogue.json")
    
    # If catalog file is not published yet, publish force automatically
    if not catalog_bytes:
        from app.services.catalog_service import publish_catalog
        try:
            publish_catalog(db=db, published_by="system", force=True)
            catalog_bytes = storage_backend.get_file("published/catalogue.json")
        except Exception:
            pass

    if catalog_bytes:
        data = json.loads(catalog_bytes.decode("utf-8"))
        sections = data.get("sections", {})

        matching_results = []
        q_clean = q.lower().strip() if q else None
        cat_clean = category.lower().strip() if category else None
        lang_clean = language.lower().strip() if language else None
        sec_clean = section.lower().strip() if section else None

        for sec_name, shows in sections.items():
            if sec_clean and sec_name.lower() != sec_clean:
                continue

            for show in shows:
                show_categories = [c.lower() for c in show.get("categories", [])]
                if cat_clean and cat_clean not in show_categories:
                    continue

                show_title = show.get("title", "")
                show_synopsis = show.get("synopsis", "") or ""

                for season in show.get("seasons", []):
                    for ep in season.get("episodes", []):
                        ep_title = ep.get("episode_title", "")
                        ep_langs = [l.lower() for l in ep.get("available_languages", [])]

                        if lang_clean and lang_clean not in ep_langs:
                            continue

                        if q_clean:
                            match_show = q_clean in show_title.lower()
                            match_ep = q_clean in ep_title.lower()
                            match_cat = any(q_clean in c for c in show_categories)
                            if not (match_show or match_ep or match_cat):
                                continue

                        matching_results.append({
                            "show_id": show.get("id"),
                            "show_title": show_title,
                            "slug": show.get("slug"),
                            "section": sec_name,
                            "categories": show.get("categories", []),
                            "synopsis": show_synopsis,
                            "poster_url": show.get("poster_url"),
                            "banner_url": show.get("banner_url"),
                            "content_group": ep.get("content_group"),
                            "season_number": ep.get("season_number"),
                            "episode_number": ep.get("episode_number"),
                            "episode_title": ep_title,
                            "duration_seconds": ep.get("duration_seconds"),
                            "available_languages": ep.get("available_languages", []),
                            "artworks": ep.get("artworks", {})
                        })

        return {
            "query": {"q": q, "category": category, "language": language, "section": section},
            "total_matches": len(matching_results),
            "results": matching_results
        }

    return {"query": {"q": q}, "total_matches": 0, "results": []}
