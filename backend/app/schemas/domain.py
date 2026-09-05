from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Artwork Schemas
class ArtworkBase(BaseModel):
    art_type: str
    url: str
    width: int
    height: int
    size_bytes: int

class ArtworkResponse(ArtworkBase):
    id: int
    episode_id: int
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Episode Schemas
class EpisodeBase(BaseModel):
    episode_id: str
    episode_number: int
    episode_title: str
    duration_seconds: Optional[int] = None
    language: str = "en"
    content_group: str
    status: str = "draft"

class EpisodeCreate(EpisodeBase):
    show_id: int
    season_number: int = 1

class EpisodeUpdate(BaseModel):
    episode_title: Optional[str] = None
    duration_seconds: Optional[int] = None
    language: Optional[str] = None
    content_group: Optional[str] = None
    status: Optional[str] = None
    season_number: Optional[int] = None

class EpisodeResponse(EpisodeBase):
    id: int
    season_id: int
    season_number: int
    show_id: int
    show_title: str
    artworks: List[ArtworkResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Season Schemas
class SeasonResponse(BaseModel):
    id: int
    show_id: int
    season_number: int
    episodes: List[EpisodeResponse] = []

    class Config:
        from_attributes = True

# Show Schemas
class ShowBase(BaseModel):
    title: str
    slug: str
    section: Optional[str] = None
    categories: List[str] = []
    synopsis: Optional[str] = None

class ShowCreate(ShowBase):
    pass

class ShowUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    section: Optional[str] = None
    categories: Optional[List[str]] = None
    synopsis: Optional[str] = None

class ShowResponse(ShowBase):
    id: int
    seasons: List[SeasonResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Validation Report Schemas
class ValidationIssue(BaseModel):
    entity_type: str  # "show" or "episode"
    entity_id: str  # show title or episode_id
    show_title: str
    episode_title: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    field: str
    issue_type: str  # "missing_artwork", "missing_duration", "missing_section", "duplicate_content_group"
    message: str

class ValidationReportResponse(BaseModel):
    can_publish: bool
    total_issues: int
    issues_by_type: Dict[str, List[ValidationIssue]]
    issues_by_show: Dict[str, List[ValidationIssue]]

# Publish Run Schemas
class PublishRunResponse(BaseModel):
    id: int
    published_at: datetime
    published_by: str
    shows_count: int
    episodes_count: int
    outcome: str
    error_message: Optional[str] = None
    catalog_file_key: Optional[str] = None

    class Config:
        from_attributes = True

# Catalog Search Response
class SearchResultItem(BaseModel):
    show_title: str
    slug: str
    section: Optional[str]
    categories: List[str]
    synopsis: Optional[str]
    episode_id: str
    episode_title: str
    season_number: int
    episode_number: int
    duration_seconds: Optional[int]
    available_languages: List[str]
    content_group: str
    artworks: Dict[str, str]  # poster, banner, thumbnail URLs
