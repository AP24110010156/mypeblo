import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Show(Base):
    __tablename__ = "shows"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    section = Column(String(50), nullable=True, index=True)  # featured, series, minisodes, songs
    categories = Column(JSON, nullable=False, default=list)  # list of strings
    synopsis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    seasons = relationship("Season", back_populates="show", cascade="all, delete-orphan")

class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    show_id = Column(Integer, ForeignKey("shows.id", ondelete="CASCADE"), nullable=False)
    season_number = Column(Integer, nullable=False, default=1)  # 0 is reserved for trailers
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    show = relationship("Show", back_populates="seasons")
    episodes = relationship("Episode", back_populates="season", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("show_id", "season_number", name="uq_show_season"),
    )

class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    episode_id = Column(String(50), nullable=False, unique=True, index=True)  # ep_0001
    season_id = Column(Integer, ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False)
    episode_number = Column(Integer, nullable=False)
    episode_title = Column(String(255), nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    language = Column(String(10), nullable=False, default="en", index=True)
    content_group = Column(String(100), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="draft", index=True)  # published, draft, archived
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    season = relationship("Season", back_populates="episodes")
    artworks = relationship("Artwork", back_populates="episode", cascade="all, delete-orphan")

    __table_args__ = (
        # Convention constraint from reference.json: (content_group, language) must be unique
        UniqueConstraint("content_group", "language", name="uq_content_group_language"),
    )

class Artwork(Base):
    __tablename__ = "artworks"

    id = Column(Integer, primary_key=True, index=True)
    episode_id = Column(Integer, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)
    art_type = Column(String(20), nullable=False)  # poster, banner, thumbnail
    file_path = Column(String(500), nullable=False)
    url = Column(String(500), nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    episode = relationship("Episode", back_populates="artworks")

    __table_args__ = (
        UniqueConstraint("episode_id", "art_type", name="uq_episode_art_type"),
    )

class PublishRun(Base):
    __tablename__ = "publish_runs"

    id = Column(Integer, primary_key=True, index=True)
    published_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    published_by = Column(String(100), nullable=False, default="admin")
    shows_count = Column(Integer, nullable=False, default=0)
    episodes_count = Column(Integer, nullable=False, default=0)
    outcome = Column(String(20), nullable=False)  # success, failed, blocked
    error_message = Column(Text, nullable=True)
    catalog_file_key = Column(String(255), nullable=True)
