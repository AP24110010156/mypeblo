import json
import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.schema import Show, Season, Episode, Artwork, PublishRun

def seed_database(db: Session, seed_json_path: str = None):
    Base.metadata.create_all(bind=engine)

    if db.query(Show).count() > 0:
        print("Database already seeded. Skipping seed process.")
        return

    if not seed_json_path:
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        seed_json_path = base_dir / "data" / "seed_shows.json"

    print(f"Loading seed data from {seed_json_path}...")
    with open(seed_json_path, "r", encoding="utf-8") as f:
        episodes_data = json.load(f)

    shows_cache = {}
    seasons_cache = {}
    seen_cg_lang = set()

    for ep_data in episodes_data:
        show_title = ep_data["show_title"]
        slug = ep_data["slug"]
        section = ep_data.get("section")
        categories = ep_data.get("categories", [])
        synopsis = ep_data.get("synopsis", "")
        season_num = ep_data.get("season_number", 1)

        # 1. Get or create Show
        if show_title not in shows_cache:
            show = db.query(Show).filter(Show.title == show_title).first()
            if not show:
                show = Show(
                    title=show_title,
                    slug=slug,
                    section=section,
                    categories=categories,
                    synopsis=synopsis
                )
                db.add(show)
                db.flush()
            shows_cache[show_title] = show
        else:
            show = shows_cache[show_title]

        # 2. Get or create Season
        season_key = (show.id, season_num)
        if season_key not in seasons_cache:
            season = db.query(Season).filter(Season.show_id == show.id, Season.season_number == season_num).first()
            if not season:
                season = Season(show_id=show.id, season_number=season_num)
                db.add(season)
                db.flush()
            seasons_cache[season_key] = season
        else:
            season = seasons_cache[season_key]

        # 3. Create Episode
        ep_id = ep_data["episode_id"]
        cg = ep_data["content_group"]
        lang = ep_data["language"]

        # Ensure uniqueness of (content_group, language) in database seed
        cg_lang_key = (cg, lang)
        if cg_lang_key in seen_cg_lang:
            # Mark duplicate as distinct content_group in DB so seed completes cleanly
            cg = f"{cg}_duplicate_{ep_id}"
        else:
            seen_cg_lang.add(cg_lang_key)

        episode = Episode(
            episode_id=ep_id,
            season_id=season.id,
            episode_number=ep_data.get("episode_number", 1),
            episode_title=ep_data.get("episode_title", ""),
            duration_seconds=ep_data.get("duration_seconds"),
            language=lang,
            content_group=cg,
            status=ep_data.get("status", "draft")
        )
        db.add(episode)
        db.flush()

        # 4. Attach Artworks available in seed
        available_art = ep_data.get("artwork_available", [])
        for art_type in available_art:
            dimensions = {
                "poster": (600, 900),
                "banner": (1280, 720),
                "thumbnail": (640, 360)
            }.get(art_type, (640, 360))

            art = Artwork(
                episode_id=episode.id,
                art_type=art_type,
                file_path=f"sample_assets/{art_type}_good.jpg",
                url=f"http://localhost:8000/sample_assets/{art_type}_good.jpg",
                width=dimensions[0],
                height=dimensions[1],
                size_bytes=15000
            )
            db.add(art)

    db.commit()
    print(f"Database seeded successfully with {len(episodes_data)} episodes across {len(shows_cache)} shows.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
