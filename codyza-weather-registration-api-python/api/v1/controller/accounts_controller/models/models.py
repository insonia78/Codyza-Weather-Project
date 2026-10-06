from pydantic import EmailStr, StringConstraints
from sqlmodel import Field, SQLModel
from typing import Annotated, Literal


PasswordStr = Annotated[str, StringConstraints(min_length=8)]
AccountRole = Literal["user", "admin"]


class AccountBase(SQLModel):
    email: EmailStr = Field()
    password: PasswordStr = Field()


class AccountEmailLookup(SQLModel):
    email: EmailStr = Field()


class Account(SQLModel, table=True):
    __tablename__: str = "accounts"

    id: int | None = Field(default=None, primary_key=True)
    email: EmailStr = Field()
    password: str | None = Field(default=None)
    password_salt: str | None = Field(default=None)
    role: str = Field(default="user")


class AccountPublic(SQLModel):
    id: int
    email: EmailStr
    role: AccountRole


class AccountLoginPublic(SQLModel):
    email: EmailStr
    role: AccountRole
    password_setup_required: bool = False


class AccountPasswordSetup(SQLModel):
    email: EmailStr = Field()
    password: PasswordStr = Field()


class AccountUpdate(SQLModel):
    email: EmailStr | None = None
    password: PasswordStr | None = None
