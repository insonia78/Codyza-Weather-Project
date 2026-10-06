import unittest
from unittest.mock import Mock

from fastapi import HTTPException, status

from controller.accounts_controller.accounts_controller import create_account
from controller.accounts_controller.models.models import Account, AccountBase


class CreateAccountTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_account_rejects_duplicate_email(self) -> None:
        existing_account = Account(
            id=1,
            email="user@example.com",
            password="stored-password-hash",
            password_salt="stored-password-salt",
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
        self.assertNotEqual(session.add.call_args.args[0].password, "password123")
        self.assertTrue(session.add.call_args.args[0].password_salt)
        session.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
