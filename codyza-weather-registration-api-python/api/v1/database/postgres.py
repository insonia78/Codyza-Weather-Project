

import os
from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlmodel import SQLModel, Session, create_engine

from controller.accounts_controller.models import models

load_dotenv()

postgre_file_name = os.getenv("POSTGRES_FILE_NAME")
postgre_url=f"{os.getenv('POSTGRES_URL')}"

def _create_admin_engine():
    admin_url = make_url(postgre_url).set(database="postgres")
    return create_engine(admin_url, isolation_level="AUTOCOMMIT")

engine = create_engine(
    postgre_url, 
    echo=True
)


def ensure_database_exists():
    admin_engine = _create_admin_engine()

    with admin_engine.connect() as connection:
        database_exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :database_name"),
            {"database_name": postgre_file_name},
        ).scalar_one_or_none()

        if database_exists is None:
            connection.exec_driver_sql(f'DROP DATABASE IF EXISTS "{postgre_file_name}"')
            connection.exec_driver_sql(f'CREATE DATABASE "{postgre_file_name}"')

def create_db_and_tables():
    ensure_database_exists()
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]