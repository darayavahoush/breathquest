"""
routers/patients.py — Patient management (therapist-only).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.models import Therapist, Patient, GameSession
from schemas.schemas import PatientCreate, PatientUpdate, PatientOut, PatientDetailOut
from core.security import hash_pin
from core.deps import get_current_therapist

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_patient(
    data: PatientCreate,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    patient = Patient(
        therapist_id=therapist.id,
        first_name=data.first_name,
        avatar=data.avatar,
        pin_hash=hash_pin(data.pin),
        age=data.age,
        diagnosis_notes=data.diagnosis_notes,
    )
    db.add(patient)
    await db.flush()
    return patient


@router.get("", response_model=list[PatientDetailOut])
async def list_patients(
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient)
        .where(Patient.therapist_id == therapist.id)
        .order_by(Patient.created_at.desc())
    )
    patients = result.scalars().all()

    out = []
    for p in patients:
        # Get session stats
        stats = await db.execute(
            select(
                func.count(GameSession.id).label("total"),
                func.sum(GameSession.stars_earned).label("stars"),
                func.max(GameSession.started_at).label("last"),
            ).where(GameSession.patient_id == p.id)
        )
        row = stats.one()
        out.append(PatientDetailOut(
            **PatientOut.model_validate(p).model_dump(),
            diagnosis_notes=p.diagnosis_notes,
            total_sessions=row.total or 0,
            total_stars=int(row.stars or 0),
            last_session_at=row.last,
        ))
    return out


@router.get("/{patient_id}", response_model=PatientDetailOut)
async def get_patient(
    patient_id: str,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id,
                              Patient.therapist_id == therapist.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    stats = await db.execute(
        select(
            func.count(GameSession.id).label("total"),
            func.sum(GameSession.stars_earned).label("stars"),
            func.max(GameSession.started_at).label("last"),
        ).where(GameSession.patient_id == patient.id)
    )
    row = stats.one()
    return PatientDetailOut(
        **PatientOut.model_validate(patient).model_dump(),
        diagnosis_notes=patient.diagnosis_notes,
        total_sessions=row.total or 0,
        total_stars=int(row.stars or 0),
        last_session_at=row.last,
    )


@router.patch("/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: str,
    data: PatientUpdate,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id,
                              Patient.therapist_id == therapist.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(patient, field, value)

    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: str,
    therapist: Therapist = Depends(get_current_therapist),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id,
                              Patient.therapist_id == therapist.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await db.delete(patient)
