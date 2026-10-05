from pydantic import EmailStr, StringConstraints
from sqlmodel import Field, SQLModel
from typing import Annotated


PasswordStr = Annotated[str, StringConstraints(min_length=8)]


# Base model class - shared fields for all representations of a room
class AccountBase(SQLModel):
    email:str = Field()
    password:str = Field()


# Account table model - maps to the "accounts" database table
class Account(AccountBase, table=True):
    __tablename__: str = "accounts"

    id: int | None = Field(default=None, primary_key=True)


# Account response model - the payload to send back to the client
# Guaranteed to have ID for the account (account must exist)
class AccountPublic(AccountBase):
    id: int


# Account update model - all fields can be optional because
# we fallback to None
class AccountUpdate(SQLModel):
    email: EmailStr | None = None
    password: PasswordStr | None = None
