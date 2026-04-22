import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.platform_account import PlatformAccount
from app.schemas.platform import (
    PlatformAccountCreate,
    PlatformAccountResponse,
    PlatformAccountUpdate,
)

router = APIRouter()


@router.post("/platforms/accounts", response_model=PlatformAccountResponse, status_code=201)
async def create_platform_account(
    data: PlatformAccountCreate, db: AsyncSession = Depends(get_db)
):
    account = PlatformAccount(**data.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/platforms/accounts", response_model=list[PlatformAccountResponse])
async def list_platform_accounts(
    brand_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)
):
    query = select(PlatformAccount)
    if brand_id:
        query = query.where(PlatformAccount.brand_id == brand_id)
    result = await db.execute(query.order_by(PlatformAccount.created_at.desc()))
    return result.scalars().all()


@router.patch("/platforms/accounts/{account_id}", response_model=PlatformAccountResponse)
async def update_platform_account(
    account_id: uuid.UUID,
    data: PlatformAccountUpdate,
    db: AsyncSession = Depends(get_db),
):
    account = await db.get(PlatformAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Platform account not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(account, field, value)

    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/platforms/accounts/{account_id}", status_code=204)
async def delete_platform_account(
    account_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    account = await db.get(PlatformAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Platform account not found")
    await db.delete(account)
    await db.commit()
