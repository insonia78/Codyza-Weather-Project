import React from 'react';
import type { ActionFunctionArgs, RouteObject } from 'react-router-dom';
import ResetPasswordPage from './index';
import { validateResetPasswordForm } from './functions';

export type ResetPasswordActionData = {
	errors?: string[];
	success?: string;
	values?: {
		email: string;
	};
};

export async function resetPasswordAction({ request }: ActionFunctionArgs): Promise<ResetPasswordActionData> {
	const formData = await request.formData();
	const email = String(formData.get('email') ?? '');
	const errors = validateResetPasswordForm({ email });

	if (errors.length > 0) {
		return {
			errors,
			values: { email },
		};
	}

	try {
    const headers = {
      "Content-Type": "application/json",
      "apiKey": process.env.REACT_APP_API_KEY ?? "",
    };

    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/accounts/reset-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: headers,
    });
	if(response.ok) {
		// Password reset request successful, do nothing special here
		localStorage.setItem("jwt_token", (await response.json()).token);
	} else {
		(() => { throw new Error('Password reset request failed.'); })();
	}
  } catch (error) {
    console.error("Password reset request failed:", error);
    return {
      errors: ["Password reset request failed. Please try again."],
      values: { email },
    };
  }
	return {
		success: 'Password reset request submitted successfully.',
		values: { email },
	};
}

const resetPasswordRoute: RouteObject = {
	path: '/reset-password',
	element: React.createElement(ResetPasswordPage),
	action: resetPasswordAction,
};

export default resetPasswordRoute;
