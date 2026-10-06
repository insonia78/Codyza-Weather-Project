from pydantic import EmailStr, StringConstraints
from sqlmodel import Field, SQLModel
from typing import Annotated


PasswordStr = Annotated[str, StringConstraints(min_length=8)]


class AccountBase(SQLModel):
    email: EmailStr = Field()
    password: PasswordStr = Field()


class Account(SQLModel, table=True):
    __tablename__: str = "accounts"

    id: int | None = Field(default=None, primary_key=True)
    email: EmailStr = Field()
    password: str = Field()
    password_salt: str | None = Field(default=None)


class AccountPublic(SQLModel):
    id: int
    email: EmailStr


class AccountEmailPublic(SQLModel):
    email: EmailStr


class AccountUpdate(SQLModel):
    email: EmailStr | None = None
    password: PasswordStr | None = None
