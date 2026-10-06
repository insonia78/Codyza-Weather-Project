from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import select

from controller.accounts_controller.models.models import (
    Account,
    AccountBase,
    AccountEmailLookup,
    AccountLoginPublic,
    AccountPasswordSetup,
    AccountPublic,
    AccountUpdate,
)
from controller.accounts_controller.passwords import create_password_hash, verify_password
from database.postgres import SessionDep


def normalize_email(email: str) -> str:
    return email.strip().lower()


def find_account_by_email(email: str, session: SessionDep) -> Account | None:
    normalized_email = normalize_email(email)
    statement = select(Account).where(func.lower(Account.email) == normalized_email)
    return session.exec(statement).first()


def normalize_account_role(account: Account, session: SessionDep) -> str:
    role = (account.role or "").strip().lower()
    if role in {"user", "admin"}:
        return role

    account.role = "user"
    session.add(account)
    session.commit()
    session.refresh(account)
    return "user"


def get_account_access(body: AccountEmailLookup, session: SessionDep) -> AccountLoginPublic:
    try:
        account = find_account_by_email(body.email, session)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found",
            )

        role = normalize_account_role(account, session)
        return AccountLoginPublic(
            email=account.email,
            role=role,
            password_setup_required=not account.password,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read account access state",
        ) from exc


def get_account(body: AccountBase, session: SessionDep) -> AccountLoginPublic:
    try:
        account = find_account_by_email(body.email, session)
        if not account or not verify_password(body.password, account.password, account.password_salt):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found",
            )

        role = normalize_account_role(account, session)
        if account.password_salt is None:
            account.password, account.password_salt = create_password_hash(body.password)
            session.add(account)
            session.commit()
            session.refresh(account)

        return AccountLoginPublic(
            email=account.email,
            role=role,
            password_setup_required=False,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get account",
        ) from exc


def create_account_password(body: AccountPasswordSetup, session: SessionDep) -> AccountLoginPublic:
    try:
        account = find_account_by_email(body.email, session)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found",
            )

        if account.password:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Account password already exists",
            )

        role = normalize_account_role(account, session)
        account.password, account.password_salt = create_password_hash(body.password)
        session.add(account)
        session.commit()
        session.refresh(account)

        return AccountLoginPublic(
            email=account.email,
            role=role,
            password_setup_required=False,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account password",
        ) from exc


async def create_account(body: AccountBase, session: SessionDep) -> AccountPublic:
    try:
        normalized_email = normalize_email(body.email)
        existing_account = find_account_by_email(normalized_email, session)
        if existing_account:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        password_hash, password_salt = create_password_hash(body.password)
        account = Account(
            email=normalized_email,
            password=password_hash,
            password_salt=password_salt,
            role="user",
        )

        session.add(account)
        session.commit()
        session.refresh(account)
        return account
    except HTTPException:
        raise
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
            if k == "password":
                account.password, account.password_salt = create_password_hash(v)
                continue
            if k == "email":
                v = normalize_email(v)
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
            if k == "password":
                account.password, account.password_salt = create_password_hash(v)
                continue
            if k == "email":
                v = normalize_email(v)
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
