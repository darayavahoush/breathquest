"""
routers/dashboard.py — Therapist dashboard: analytics, progress, notes.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from database import get_db
from models.models import Therapist, Patient, GameSession, TherapistNote
from schemas.schemas import (
    PatientProgress, LevelProgress, DashboardSummary,
    PatientDetailOut, PatientOut, SessionOut,
    NoteCreate, NoteUpdate, NoteOut,
)
from core.deps import get_current_therapist

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

LEVEL_NAMES = {
    "pinwheel":    "Pinwheel Spin",
    "float_rider": "Float Rider",
    "candle":      "Candle Gauntlet",
    "balloon":     "Balloon Pop",
    "dandelion":   "Dandelion Storm",
    "dragon":      "Dragon Fire",
}


# ------------------------------------------------------------------ #
#  Summary                                                             #
# ------------------------------------------------------------------ #

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    # All patients
    patients_result = await db.execute(
        select(Patient).where(Patient.therapist_id == therapist.id)
    )
    patients = patients_result.scalars().all()
    patient_ids = [p.id for p in patients]

    active_count = sum(1 for p in patients if p.is_active)

    # Sessions this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_sessions = await db.execute(
        select(
            func.count(GameSession.id).label("count"),
            func.avg(GameSession.stars_earned).label("avg_stars"),
        ).where(
            and_(
                GameSession.patient_id.in_(patient_ids),
                GameSession.started_at >= week_ago,
                GameSession.completed == True,
            )
        )
    )
    week_row = week_sessions.one()

    # Build patient detail list
    patient_details = []
    for p in patients:
        stats = await db.execute(
            select(
                func.count(GameSession.id).label("total"),
                func.sum(GameSession.stars_earned).label("stars"),
                func.max(GameSession.started_at).label("last"),
            ).where(GameSession.patient_id == p.id)
        )
        row = stats.one()
        patient_details.append(PatientDetailOut(
            **PatientOut.model_validate(p).model_dump(),
            diagnosis_notes=p.diagnosis_notes,
            total_sessions=row.total or 0,
            total_stars=int(row.stars or 0),
            last_session_at=row.last,
        ))

    return DashboardSummary(
        total_patients=len(patients),
        active_patients=active_count,
        sessions_this_week=week_row.count or 0,
        avg_stars_this_week=round(float(week_row.avg_stars), 2) if week_row.avg_stars else None,
        most_improved_patient=None,   # TODO: implement trend analysis
        patients=patient_details,
    )


# ------------------------------------------------------------------ #
#  Patient progress                                                    #
# ------------------------------------------------------------------ #

@router.get("/patients/{patient_id}/progress", response_model=PatientProgress)
async def get_patient_progress(
    patient_id: str,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    patient_result = await db.execute(
        select(Patient).where(Patient.id == patient_id,
                              Patient.therapist_id == therapist.id)
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # All completed sessions
    sessions_result = await db.execute(
        select(GameSession)
        .where(GameSession.patient_id == patient_id)
        .order_by(GameSession.started_at.desc())
    )
    sessions = sessions_result.scalars().all()
    completed = [s for s in sessions if s.completed]

    total_stars = sum(s.stars_earned or 0 for s in completed)
    max_possible = len(LEVEL_NAMES) * 3

    # Per-level breakdown
    level_progress = []
    for level_id, level_name in LEVEL_NAMES.items():
        level_sessions = [s for s in completed if s.level_id == level_id]
        if level_sessions:
            best_stars = max(s.stars_earned or 0 for s in level_sessions)
            avg_stars = sum(s.stars_earned or 0 for s in level_sessions) / len(level_sessions)
            breath_vals = [s.avg_breath_strength for s in level_sessions if s.avg_breath_strength]
            avg_breath = sum(breath_vals) / len(breath_vals) if breath_vals else None
            last_played = max(s.started_at for s in level_sessions)
        else:
            best_stars = 0
            avg_stars = 0.0
            avg_breath = None
            last_played = None

        level_progress.append(LevelProgress(
            level_id=level_id,
            level_name=level_name,
            attempts=len([s for s in sessions if s.level_id == level_id]),
            best_stars=best_stars,
            avg_stars=round(avg_stars, 2),
            avg_breath_strength=round(avg_breath, 3) if avg_breath else None,
            last_played=last_played,
        ))

    # Improvement trend (compare last 5 vs previous 5 sessions)
    trend = None
    if len(completed) >= 6:
        recent = [s.stars_earned or 0 for s in completed[:5]]
        older  = [s.stars_earned or 0 for s in completed[5:10]]
        trend = round((sum(recent) / len(recent)) - (sum(older) / len(older)), 2)

    breath_vals = [s.avg_breath_strength for s in completed if s.avg_breath_strength]
    avg_breath_overall = round(sum(breath_vals) / len(breath_vals), 3) if breath_vals else None

    return PatientProgress(
        patient_id=patient.id,
        first_name=patient.first_name,
        avatar=patient.avatar,
        total_sessions=len(sessions),
        total_stars=total_stars,
        max_possible_stars=max_possible,
        completion_rate=round(len(completed) / len(sessions), 2) if sessions else 0.0,
        avg_breath_strength=avg_breath_overall,
        improvement_trend=trend,
        level_progress=level_progress,
        recent_sessions=[SessionOut.model_validate(s) for s in sessions[:10]],
    )


# ------------------------------------------------------------------ #
#  Notes                                                               #
# ------------------------------------------------------------------ #

@router.post("/patients/{patient_id}/notes", response_model=NoteOut, status_code=201)
async def create_note(
    patient_id: str,
    data: NoteCreate,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    patient_result = await db.execute(
        select(Patient).where(Patient.id == patient_id,
                              Patient.therapist_id == therapist.id)
    )
    if not patient_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    note = TherapistNote(
        patient_id=patient_id,
        therapist_id=therapist.id,
        session_id=data.session_id,
        content=data.content,
        tags=data.tags,
    )
    db.add(note)
    await db.flush()
    return note


@router.get("/patients/{patient_id}/notes", response_model=list[NoteOut])
async def list_notes(
    patient_id: str,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    patient_result = await db.execute(
        select(Patient).where(Patient.id == patient_id,
                              Patient.therapist_id == therapist.id)
    )
    if not patient_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    result = await db.execute(
        select(TherapistNote)
        .where(TherapistNote.patient_id == patient_id)
        .order_by(TherapistNote.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: str,
    data: NoteUpdate,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TherapistNote).where(TherapistNote.id == note_id,
                                    TherapistNote.therapist_id == therapist.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(note, field, value)

    note.updated_at = datetime.now(timezone.utc)
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: str,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TherapistNote).where(TherapistNote.id == note_id,
                                    TherapistNote.therapist_id == therapist.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
