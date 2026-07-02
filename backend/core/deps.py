"""
core/deps.py — FastAPI dependency injection for auth.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.models import Therapist, Patient
from core.security import decode_access_token, decode_kid_token

bearer = HTTPBearer()


async def get_current_therapist(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Therapist:
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload or payload.get("type") != "therapist":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    result = await db.execute(select(Therapist).where(Therapist.id == payload["sub"]))
    therapist = result.scalar_one_or_none()

    if not therapist or not therapist.is_active:
        raise HTTPException(status_code=401, detail="Therapist not found or inactive")

    return therapist


async def get_current_patient(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    token = credentials.credentials
    payload = decode_kid_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired kid token",
        )

    result = await db.execute(select(Patient).where(Patient.id == payload["sub"]))
    patient = result.scalar_one_or_none()

    if not patient or not patient.is_active:
        raise HTTPException(status_code=401, detail="Patient not found or inactive")

    return patient
