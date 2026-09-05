from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.schema import Show, Season, Episode, Artwork
from app.schemas.domain import ValidationIssue, ValidationReportResponse

def generate_validation_report(db: Session) -> ValidationReportResponse:
    """
    Scans the database for validation issues blocking publish.
    Returns structured report grouped by issue type and by show.
    """
    issues_by_type = defaultdict(list)
    issues_by_show = defaultdict(list)

    # 1. Fetch published episodes
    episodes = db.query(Episode).join(Season).join(Show).all()
    shows = db.query(Show).all()

    # Track content_group + language uniqueness
    cg_lang_map = defaultdict(list)

    for ep in episodes:
        show = ep.season.show
        cg_lang_map[(ep.content_group, ep.language)].append(ep)

        if ep.status == "published":
            # Check duration
            if not ep.duration_seconds or ep.duration_seconds <= 0:
                issue = ValidationIssue(
                    entity_type="episode",
                    entity_id=ep.episode_id,
                    show_title=show.title,
                    episode_title=ep.episode_title,
                    season_number=ep.season.season_number,
                    episode_number=ep.episode_number,
                    field="duration_seconds",
                    issue_type="missing_duration",
                    message=f"Episode '{ep.episode_title}' (S{ep.season.season_number}E{ep.episode_number}) is published but has no duration set."
                )
                issues_by_type["missing_duration"].append(issue)
                issues_by_show[show.title].append(issue)

            # Check artwork completeness (poster, banner, thumbnail)
            existing_art_types = {art.art_type.lower() for art in ep.artworks}
            required_types = {"poster", "banner", "thumbnail"}
            missing_types = sorted(list(required_types - existing_art_types))

            if missing_types:
                issue = ValidationIssue(
                    entity_type="episode",
                    entity_id=ep.episode_id,
                    show_title=show.title,
                    episode_title=ep.episode_title,
                    season_number=ep.season.season_number,
                    episode_number=ep.episode_number,
                    field="artwork",
                    issue_type="missing_artwork",
                    message=f"Episode '{ep.episode_title}' (S{ep.season.season_number}E{ep.episode_number}) is published but missing required artwork: {', '.join(missing_types)}."
                )
                issues_by_type["missing_artwork"].append(issue)
                issues_by_show[show.title].append(issue)

    # 2. Check Show Section Requirement for published episodes/shows
    for show in shows:
        published_eps = [
            ep for season in show.seasons for ep in season.episodes if ep.status == "published"
        ]
        if published_eps and not show.section:
            issue = ValidationIssue(
                entity_type="show",
                entity_id=show.title,
                show_title=show.title,
                field="section",
                issue_type="missing_section",
                message=f"Show '{show.title}' has published episodes but no section assigned."
            )
            issues_by_type["missing_section"].append(issue)
            issues_by_show[show.title].append(issue)

    # 3. Check (content_group, language) duplicates
    for (cg, lang), dup_eps in cg_lang_map.items():
        if len(dup_eps) > 1:
            ep_ids = ", ".join([e.episode_id for e in dup_eps])
            show_title = dup_eps[0].season.show.title
            issue = ValidationIssue(
                entity_type="episode",
                entity_id=dup_eps[0].episode_id,
                show_title=show_title,
                field="content_group",
                issue_type="duplicate_content_group",
                message=f"Duplicate content_group '{cg}' for language '{lang}' found across episodes: {ep_ids}."
            )
            issues_by_type["duplicate_content_group"].append(issue)
            issues_by_show[show_title].append(issue)

    total_issues = sum(len(v) for v in issues_by_type.values())
    can_publish = (total_issues == 0)

    return ValidationReportResponse(
        can_publish=can_publish,
        total_issues=total_issues,
        issues_by_type=dict(issues_by_type),
        issues_by_show=dict(issues_by_show)
    )
