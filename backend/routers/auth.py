"""
routers/auth.py — Authentication for therapists (JWT) and kids (PIN).
"""

import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.models import Therapist, Patient
from schemas.schemas import (
    TherapistRegister, TherapistLogin, TokenResponse,
    KidLoginRequest, KidTokenResponse, KidRegisterRequest,
)
from core.security import (
    hash_password, verify_password,
    create_access_token,
    hash_pin, verify_pin, create_kid_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ------------------------------------------------------------------ #
#  Therapist auth                                                      #
# ------------------------------------------------------------------ #

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_therapist(data: TherapistRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Therapist).where(Therapist.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    therapist = Therapist(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        clinic_name=data.clinic_name,
    )
    db.add(therapist)
    await db.flush()

    token = create_access_token(therapist.id)
    return TokenResponse(
        access_token=token,
        therapist_id=therapist.id,
        full_name=therapist.full_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login_therapist(data: TherapistLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Therapist).where(Therapist.email == data.email))
    therapist = result.scalar_one_or_none()

    if not therapist or not verify_password(data.password, therapist.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not therapist.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    therapist.last_login = datetime.now(timezone.utc)

    token = create_access_token(therapist.id)
    return TokenResponse(
        access_token=token,
        therapist_id=therapist.id,
        full_name=therapist.full_name,
    )


# ------------------------------------------------------------------ #
#  Kid self-registration                                               #
# ------------------------------------------------------------------ #

@router.post("/kid-register", response_model=KidTokenResponse, status_code=201)
async def kid_register(data: KidRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Generate short unique player code e.g. CHICK42
    while True:
        code = data.avatar.upper()[:5] + str(random.randint(10, 99))
        exists = await db.execute(select(Patient).where(Patient.player_code == code))
        if not exists.scalar_one_or_none():
            break

    patient = Patient(
        therapist_id=None,
        first_name=data.first_name,
        avatar=data.avatar,
        pin_hash=hash_pin(data.pin),
        player_code=code,
    )
    db.add(patient)
    await db.flush()

    token = create_kid_token(patient.id)
    return KidTokenResponse(
        access_token=token,
        patient_id=patient.id,
        first_name=patient.first_name,
        avatar=patient.avatar,
        player_code=code,
    )


# ------------------------------------------------------------------ #
#  Kid PIN login (using player_code + PIN)                            #
# ------------------------------------------------------------------ #

@router.post("/kid-login", response_model=KidTokenResponse)
async def kid_login(data: KidLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Patient).where(Patient.player_code == data.player_code.upper())
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Player code not found")

    if not patient.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    if not verify_pin(data.pin, patient.pin_hash):
        raise HTTPException(status_code=401, detail="Incorrect PIN")

    token = create_kid_token(patient.id)
    return KidTokenResponse(
        access_token=token,
        patient_id=patient.id,
        first_name=patient.first_name,
        avatar=patient.avatar,
        player_code=patient.player_code,
    )
