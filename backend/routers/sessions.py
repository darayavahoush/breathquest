"""
routers/sessions.py — Game session lifecycle and event logging.
Called by the game client (kid's browser/device).
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import numpy as np

from database import get_db
from models.models import Patient, GameSession, SessionEvent, SessionStatus
from schemas.schemas import (
    SessionStart, SessionEnd, SessionEventBatch,
    SessionOut,
)
from core.deps import get_current_patient

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def start_session(
    data: SessionStart,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Kid starts a level — creates a session record."""
    session = GameSession(
        patient_id=patient.id,
        level_id=data.level_id,
        status=SessionStatus.in_progress,
    )
    db.add(session)
    await db.flush()
    return session


@router.post("/{session_id}/events", status_code=status.HTTP_201_CREATED)
async def log_events(
    session_id: str,
    data: SessionEventBatch,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch-log breath samples and game events during gameplay.
    Frontend sends these every ~2 seconds to avoid hammering the API.
    """
    result = await db.execute(
        select(GameSession).where(
            GameSession.id == session_id,
            GameSession.patient_id == patient.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Session already ended")

    for ev in data.events:
        db.add(SessionEvent(
            session_id=session_id,
            event_type=ev.event_type,
            breath_value=ev.breath_value,
            event_data=ev.event_data,
        ))

    return {"logged": len(data.events)}


@router.post("/{session_id}/end", response_model=SessionOut)
async def end_session(
    session_id: str,
    data: SessionEnd,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Kid finishes or abandons a level."""
    result = await db.execute(
        select(GameSession).where(
            GameSession.id == session_id,
            GameSession.patient_id == patient.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    session.ended_at = now
    session.duration_seconds = (now - session.started_at).total_seconds()
    session.status = SessionStatus.completed if data.completed else SessionStatus.abandoned
    session.stars_earned = data.stars_earned
    session.completed = data.completed
    session.completion_message = data.completion_message
    session.avg_breath_strength = data.avg_breath_strength
    session.max_breath_strength = data.max_breath_strength
    session.breath_consistency = data.breath_consistency
    session.total_puffs = data.total_puffs
    session.lives_lost = data.lives_lost

    return session


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GameSession).where(
            GameSession.id == session_id,
            GameSession.patient_id == patient.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
