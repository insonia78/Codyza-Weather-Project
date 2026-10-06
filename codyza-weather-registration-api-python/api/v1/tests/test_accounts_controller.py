import unittest
from unittest.mock import Mock

from fastapi import HTTPException, status

from controller.accounts_controller.accounts_controller import (
    create_account,
    create_account_password,
    get_account_access,
)
from controller.accounts_controller.models.models import (
    Account,
    AccountBase,
    AccountEmailLookup,
    AccountPasswordSetup,
)


class CreateAccountTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_account_rejects_duplicate_email(self) -> None:
        existing_account = Account(
            id=1,
            email="user@example.com",
            password="stored-password-hash",
            password_salt="stored-password-salt",
            role="user",
        )
        exec_result = Mock()
        exec_result.first.return_value = existing_account

        session = Mock()
        session.exec.return_value = exec_result

        with self.assertRaises(HTTPException) as context:
            await create_account(
                AccountBase(email="user@example.com", password="password123"),
                session,
            )

        self.assertEqual(context.exception.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(context.exception.detail, "An account with this email already exists")
        session.add.assert_not_called()
        session.commit.assert_not_called()

    async def test_create_account_persists_new_account(self) -> None:
        exec_result = Mock()
        exec_result.first.return_value = None

        session = Mock()
        session.exec.return_value = exec_result

        def refresh_account(account: Account) -> None:
            account.id = 1

        session.refresh.side_effect = refresh_account

        account = await create_account(
            AccountBase(email="user@example.com", password="password123"),
            session,
        )

        self.assertEqual(account.id, 1)
        self.assertEqual(account.email, "user@example.com")
        self.assertEqual(account.role, "user")
        self.assertNotEqual(session.add.call_args.args[0].password, "password123")
        self.assertTrue(session.add.call_args.args[0].password_salt)
        session.commit.assert_called_once()

    def test_get_account_access_requires_password_setup_when_password_missing(self) -> None:
        existing_account = Account(
            id=7,
            email="admin@example.com",
            password=None,
            password_salt=None,
            role="admin",
        )
        exec_result = Mock()
        exec_result.first.return_value = existing_account

        session = Mock()
        session.exec.return_value = exec_result

        account = get_account_access(
            AccountEmailLookup(email="admin@example.com"),
            session,
        )

        self.assertEqual(account.email, "admin@example.com")
        self.assertEqual(account.role, "admin")
        self.assertTrue(account.password_setup_required)

    def test_create_account_password_rejects_existing_password(self) -> None:
        existing_account = Account(
            id=7,
            email="admin@example.com",
            password="stored-password-hash",
            password_salt="stored-salt",
            role="admin",
        )
        exec_result = Mock()
        exec_result.first.return_value = existing_account

        session = Mock()
        session.exec.return_value = exec_result

        with self.assertRaises(HTTPException) as context:
            create_account_password(
                AccountPasswordSetup(email="admin@example.com", password="password123"),
                session,
            )

        self.assertEqual(context.exception.status_code, status.HTTP_409_CONFLICT)

    def test_create_account_password_persists_hash_for_bootstrap_user(self) -> None:
        existing_account = Account(
            id=7,
            email="admin@example.com",
            password=None,
            password_salt=None,
            role="admin",
        )
        exec_result = Mock()
        exec_result.first.return_value = existing_account

        session = Mock()
        session.exec.return_value = exec_result

        account = create_account_password(
            AccountPasswordSetup(email="admin@example.com", password="password123"),
            session,
        )

        self.assertEqual(account.email, "admin@example.com")
        self.assertEqual(account.role, "admin")
        self.assertFalse(account.password_setup_required)
        self.assertNotEqual(session.add.call_args.args[0].password, "password123")
        self.assertTrue(session.add.call_args.args[0].password_salt)
        session.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
