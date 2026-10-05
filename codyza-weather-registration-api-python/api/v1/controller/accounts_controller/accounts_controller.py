from fastapi import HTTPException, status
from controller.accounts_controller.models.models import (
    Account,
    AccountBase,
    AccountEmailPublic,
    AccountPublic,
    AccountUpdate,
)
from sqlmodel import select
from database.postgres import SessionDep


def get_account(body: AccountBase, session: SessionDep) -> AccountEmailPublic:
    try:
        statement = select(Account.email).where(
            Account.email == body.email,
            Account.password == body.password,
        )
        email = session.exec(statement).first()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found",
            )
        return AccountEmailPublic(email=email)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get account",
        ) from exc



async def create_account(body: AccountBase, session: SessionDep) -> AccountPublic:
    print("Creating account with body:", body.model_dump())
    try:
        account = Account(**body.model_dump())
        
        session.add(account)
        session.commit()
        session.refresh(account)
        return account
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account",
        ) from exc


def update_account(id: int, body: AccountBase, session: SessionDep) -> AccountPublic:
    try:
        account = session.get(Account, id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        for k, v in body.model_dump().items():
            setattr(account, k, v)
        session.add(account)
        session.commit()
        session.refresh(account)
        return account
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update account {exc}",
        ) from exc


def patch_account(id: int, body: AccountUpdate, session: SessionDep) -> AccountPublic:
    try:
        account = session.get(Account, id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(account, k, v)
        session.add(account)
        session.commit()
        session.refresh(account)
        return account
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to patch account {exc}",
        ) from exc


def delete_account(id: int, session: SessionDep) -> AccountPublic:
    try:
        account = session.get(Account, id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        session.delete(account)
        session.commit()
        return account
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account",
        ) from exc