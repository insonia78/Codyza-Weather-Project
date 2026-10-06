import React from 'react';
import type { ActionFunctionArgs, RouteObject } from 'react-router-dom';
import { redirectIfAdministrator } from '../admin-handoff';
import ResetPasswordPage from './index';
import {
  validateResetPasswordConfirmForm,
  validateResetPasswordRequestForm,
} from './functions';

export type ResetPasswordActionData = {
	errors?: string[];
	success?: string;
	values?: {
		email: string;
    password?: string;
    confirmPassword?: string;
	};
  previewUrl?: string;
  completed?: boolean;
};

export async function resetPasswordAction({ request }: ActionFunctionArgs): Promise<ResetPasswordActionData | Response> {
	const formData = await request.formData();
  const requestUrl = new URL(request.url);
  const token = String(formData.get('token') ?? requestUrl.searchParams.get('token') ?? '');
	const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (token.trim()) {
    const errors = validateResetPasswordConfirmForm({ token, password, confirmPassword });
    if (errors.length > 0) {
      return {
        errors,
        values: { email, password, confirmPassword },
      };
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/accounts/reset-password/confirm`, {
        method: "POST",
        body: JSON.stringify({ token, password }),
        headers: {
          "Content-Type": "application/json",
          "apiKey": process.env.REACT_APP_API_KEY ?? "",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Password reset confirmation failed.');
      }
    } catch (error) {
      console.error("Password reset confirmation failed:", error);
      return {
        errors: [error instanceof Error ? error.message : "Password reset confirmation failed. Please try again."],
        values: { email, password, confirmPassword },
      };
    }

    return {
      success: 'Your password has been reset. You can now sign in with the new password.',
      values: { email: '' },
      completed: true,
    };
  }

	if (!email.trim()) {
		return {
			errors: ['Email is required.'],
			values: { email },
		};
	}

	try {
    const adminRedirect = await redirectIfAdministrator(email);
    if (adminRedirect) {
      return adminRedirect;
    }

    const errors = validateResetPasswordRequestForm({ email });
    if (errors.length > 0) {
      return {
        errors,
        values: { email },
      };
    }

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/accounts/reset-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
        "apiKey": process.env.REACT_APP_API_KEY ?? "",
      },
    });

    const payload = await response.json().catch(() => null);
	if (!response.ok) {
      throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Password reset request failed.');
	}

    return {
      success: typeof payload?.message === 'string'
        ? payload.message
        : 'If an account exists for that email, a password reset link has been sent.',
      values: { email },
      previewUrl: typeof payload?.preview_url === 'string' ? payload.preview_url : undefined,
    };
  } catch (error) {
    console.error("Password reset request failed:", error);
    return {
      errors: [error instanceof Error ? error.message : "Password reset request failed. Please try again."],
      values: { email },
    };
  }
}

const resetPasswordRoute: RouteObject = {
	path: '/reset-password',
	element: React.createElement(ResetPasswordPage),
	action: resetPasswordAction,
};

export default resetPasswordRoute;
