"""
models/models.py — All database models for BreathQuest.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from database import Base


def utcnow():
    return datetime.now(timezone.utc)

def new_uuid():
    return str(uuid.uuid4())


class LevelID(str, enum.Enum):
    pinwheel    = "pinwheel"
    float_rider = "float_rider"
    candle      = "candle"
    balloon     = "balloon"
    dandelion   = "dandelion"
    dragon      = "dragon"


class SessionStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed   = "completed"
    abandoned   = "abandoned"


class Therapist(Base):
    __tablename__ = "therapists"

    id:               Mapped[str]           = mapped_column(String, primary_key=True, default=new_uuid)
    email:            Mapped[str]           = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password:  Mapped[str]           = mapped_column(String(255), nullable=False)
    full_name:        Mapped[str]           = mapped_column(String(255), nullable=False)
    clinic_name:      Mapped[str | None]    = mapped_column(String(255))
    is_active:        Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:       Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login:       Mapped[datetime|None] = mapped_column(DateTime(timezone=True))

    patients: Mapped[list["Patient"]] = relationship(back_populates="therapist", cascade="all, delete-orphan")


class Patient(Base):
    __tablename__ = "patients"

    id:               Mapped[str]           = mapped_column(String, primary_key=True, default=new_uuid)
    therapist_id:     Mapped[str | None]    = mapped_column(ForeignKey("therapists.id"), nullable=True, index=True)
    first_name:       Mapped[str]           = mapped_column(String(100), nullable=False)
    avatar:           Mapped[str]           = mapped_column(String(50), default="chick")
    pin_hash:         Mapped[str]           = mapped_column(String(64), nullable=False)
    player_code:      Mapped[str]           = mapped_column(String(10), unique=True, nullable=False, index=True)
    age:              Mapped[int | None]    = mapped_column(Integer)
    diagnosis_notes:  Mapped[str | None]   = mapped_column(Text)
    is_active:        Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:       Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)

    therapist: Mapped["Therapist | None"]   = relationship(back_populates="patients")
    sessions:  Mapped[list["GameSession"]]  = relationship(back_populates="patient", cascade="all, delete-orphan")
    notes:     Mapped[list["TherapistNote"]]= relationship(back_populates="patient", cascade="all, delete-orphan")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id:                   Mapped[str]          = mapped_column(String, primary_key=True, default=new_uuid)
    patient_id:           Mapped[str]          = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    level_id:             Mapped[str]          = mapped_column(SAEnum(LevelID), nullable=False)
    started_at:           Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=utcnow)
    ended_at:             Mapped[datetime|None]= mapped_column(DateTime(timezone=True))
    duration_seconds:     Mapped[float|None]   = mapped_column(Float)
    status:               Mapped[str]          = mapped_column(SAEnum(SessionStatus), default=SessionStatus.in_progress)
    stars_earned:         Mapped[int|None]     = mapped_column(Integer)
    completed:            Mapped[bool]         = mapped_column(Boolean, default=False)
    completion_message:   Mapped[str|None]     = mapped_column(String(255))
    avg_breath_strength:  Mapped[float|None]   = mapped_column(Float)
    max_breath_strength:  Mapped[float|None]   = mapped_column(Float)
    breath_consistency:   Mapped[float|None]   = mapped_column(Float)
    total_puffs:          Mapped[int|None]     = mapped_column(Integer)
    lives_lost:           Mapped[int|None]     = mapped_column(Integer)

    patient: Mapped["Patient"]              = relationship(back_populates="sessions")
    events:  Mapped[list["SessionEvent"]]   = relationship(back_populates="session", cascade="all, delete-orphan")


class SessionEvent(Base):
    __tablename__ = "session_events"

    id:           Mapped[str]          = mapped_column(String, primary_key=True, default=new_uuid)
    session_id:   Mapped[str]          = mapped_column(ForeignKey("game_sessions.id"), nullable=False, index=True)
    timestamp:    Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=utcnow)
    event_type:   Mapped[str]          = mapped_column(String(50))
    breath_value: Mapped[float|None]   = mapped_column(Float)
    event_data:   Mapped[dict|None]    = mapped_column(JSON)

    session: Mapped["GameSession"] = relationship(back_populates="events")


class TherapistNote(Base):
    __tablename__ = "therapist_notes"

    id:           Mapped[str]          = mapped_column(String, primary_key=True, default=new_uuid)
    patient_id:   Mapped[str]          = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    therapist_id: Mapped[str]          = mapped_column(ForeignKey("therapists.id"), nullable=False)
    created_at:   Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:   Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=utcnow)
    session_id:   Mapped[str|None]     = mapped_column(ForeignKey("game_sessions.id"))
    content:      Mapped[str]          = mapped_column(Text, nullable=False)
    tags:         Mapped[list|None]    = mapped_column(JSON)

    patient: Mapped["Patient"] = relationship(back_populates="notes")
