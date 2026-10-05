from fastapi import APIRouter, status

from controller.accounts_controller.accounts_controller import create_account, delete_account, patch_account, update_account, get_account
from database.postgres import SessionDep
from controller.accounts_controller.models.models import (
    AccountBase,
    AccountPublic,
    AccountUpdate,
)


accounts_router = APIRouter(prefix="/accounts", tags=["accounts"])


@accounts_router.post("/login", status_code=status.HTTP_200_OK)
def do_get(session: SessionDep) -> list[AccountPublic]:
    return get_account(session)


@accounts_router.post("/", status_code=status.HTTP_201_CREATED)
async def do_post(body: AccountBase, session: SessionDep) -> AccountPublic:
    print("accepted request:")
    return await create_account(body, session)


@accounts_router.put("/{id}", status_code=status.HTTP_200_OK)
def do_put(id: int,body:AccountBase, session: SessionDep) -> AccountPublic:
    return update_account(id, body, session)


@accounts_router.patch("/{id}", status_code=status.HTTP_200_OK)
def do_patch(id: int, body: AccountUpdate, session: SessionDep) -> AccountPublic:
    return patch_account(id, body, session)


@accounts_router.delete("/{id}", status_code=status.HTTP_200_OK)
def do_delete(id: int, session: SessionDep) -> AccountPublic:
    return delete_account(id, session)