import json
import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.schema import Show, Season, Episode, Artwork, PublishRun
from app.services.validation_service import generate_validation_report
from app.core.storage import storage_backend
from app.core.config import settings

def publish_catalog(db: Session, published_by: str = "admin", force: bool = False) -> dict:
    """
    Builds the published catalogue JSON and writes it atomically to storage.
    Records the run outcome in publish_runs table.
    """
    # 1. Run validation check first unless force is explicit
    report = generate_validation_report(db)
    if not report.can_publish and not force:
        # Record blocked run
        run_record = PublishRun(
            published_at=datetime.datetime.utcnow(),
            published_by=published_by,
            shows_count=0,
            episodes_count=0,
            outcome="blocked",
            error_message=f"Publish blocked: {report.total_issues} validation issue(s) remain unresolved."
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Cannot publish catalogue due to validation errors.",
                "total_issues": report.total_issues,
                "issues": [issue.dict() for show_issues in report.issues_by_show.values() for issue in show_issues]
            }
        )

    # 2. Query published content
    try:
        shows = db.query(Show).order_by(Show.title.asc()).all()

        # Define section order per reference.json
        section_order = {sec: i for i, sec in enumerate(settings.SECTIONS)}
        
        sections_dict = {sec: [] for sec in settings.SECTIONS}
        total_published_shows = 0
        total_published_episodes = 0

        for show in shows:
            # Check if show has published section and episodes
            if not show.section or show.section not in sections_dict:
                continue

            # Collect published episodes
            published_episodes = db.query(Episode)\
                .join(Season)\
                .filter(Season.show_id == show.id, Episode.status == "published")\
                .all()

            if not published_episodes:
                continue

            total_published_shows += 1

            # Group episodes by content_group
            cg_map = {}
            show_trailers = []

            for ep in published_episodes:
                total_published_episodes += 1
                season_num = ep.season.season_number
                
                # Check artwork mapping
                artworks_map = {art.art_type: art.url for art in ep.artworks}

                if season_num == 0:
                    # Season 0 is reserved for trailers
                    show_trailers.append({
                        "episode_id": ep.episode_id,
                        "episode_title": ep.episode_title,
                        "duration_seconds": ep.duration_seconds,
                        "language": ep.language,
                        "artworks": artworks_map
                    })
                else:
                    cg = ep.content_group
                    if cg not in cg_map:
                        cg_map[cg] = {
                            "content_group": cg,
                            "season_number": season_num,
                            "episode_number": ep.episode_number,
                            "episode_title": ep.episode_title,
                            "duration_seconds": ep.duration_seconds,
                            "available_languages": [ep.language],
                            "artworks": artworks_map,
                            "variants": [{
                                "episode_id": ep.episode_id,
                                "language": ep.language,
                                "duration_seconds": ep.duration_seconds
                            }]
                        }
                    else:
                        if ep.language not in cg_map[cg]["available_languages"]:
                            cg_map[cg]["available_languages"].append(ep.language)
                            cg_map[cg]["available_languages"].sort()
                        cg_map[cg]["variants"].append({
                            "episode_id": ep.episode_id,
                            "language": ep.language,
                            "duration_seconds": ep.duration_seconds
                        })

            # Sort content_group episodes by season and episode number
            grouped_episodes = list(cg_map.values())
            grouped_episodes.sort(key=lambda x: (x["season_number"], x["episode_number"]))

            # Group seasons
            seasons_dict = {}
            for item in grouped_episodes:
                s_num = item["season_number"]
                if s_num not in seasons_dict:
                    seasons_dict[s_num] = {
                        "season_number": s_num,
                        "episodes": []
                    }
                seasons_dict[s_num]["episodes"].append(item)

            seasons_list = [seasons_dict[s] for s in sorted(seasons_dict.keys())]

            # Construct published show entry
            # Artwork fallback: get poster/banner from first published episode if available
            show_poster = None
            show_banner = None
            for ep in published_episodes:
                arts = {art.art_type: art.url for art in ep.artworks}
                if not show_poster and "poster" in arts:
                    show_poster = arts["poster"]
                if not show_banner and "banner" in arts:
                    show_banner = arts["banner"]
                if show_poster and show_banner:
                    break

            show_entry = {
                "id": show.id,
                "title": show.title,
                "slug": show.slug,
                "section": show.section,
                "categories": show.categories or [],
                "synopsis": show.synopsis,
                "poster_url": show_poster,
                "banner_url": show_banner,
                "seasons": seasons_list,
                "trailers": show_trailers
            }

            sections_dict[show.section].append(show_entry)

        # 3. Format final catalogue structure
        catalog_payload = {
            "metadata": {
                "published_at": datetime.datetime.utcnow().isoformat() + "Z",
                "published_by": published_by,
                "shows_count": total_published_shows,
                "episodes_count": total_published_episodes,
                "version": "v1.0"
            },
            "sections": sections_dict
        }

        # Serialize JSON with formatting
        catalog_json_bytes = json.dumps(catalog_payload, indent=2, ensure_ascii=False).encode("utf-8")

        # 4. Save to storage ATOMICALLY
        catalog_key = "published/catalogue.json"
        published_url = storage_backend.save_file_atomically(catalog_key, catalog_json_bytes, content_type="application/json")

        # 5. Record successful publish run
        run_record = PublishRun(
            published_at=datetime.datetime.utcnow(),
            published_by=published_by,
            shows_count=total_published_shows,
            episodes_count=total_published_episodes,
            outcome="success",
            catalog_file_key=catalog_key
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)

        return {
            "status": "success",
            "message": "Catalogue published successfully.",
            "published_at": run_record.published_at.isoformat(),
            "shows_count": total_published_shows,
            "episodes_count": total_published_episodes,
            "url": published_url,
            "run_id": run_record.id
        }

    except HTTPException:
        raise
    except Exception as e:
        run_record = PublishRun(
            published_at=datetime.datetime.utcnow(),
            published_by=published_by,
            shows_count=0,
            episodes_count=0,
            outcome="failed",
            error_message=str(e)
        )
        db.add(run_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Publish process failed mid-execution: {str(e)}"
        )
