import React from "react";
import { type ActionFunctionArgs, type RouteObject } from "react-router-dom";
import RegistrationPage from "./index";
import { validateRegistrationForm } from "./functions";

export type RegistrationActionData = {
  errors?: string[];
  success?: string;
  values?: {
    email: string;
  };
};

export async function registrationAction({
  request,
}: ActionFunctionArgs): Promise<RegistrationActionData | Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const errors = validateRegistrationForm({ email, password, confirmPassword });

  if (errors.length > 0) {
    return {
      errors,
      values: { email },
    };
  }
  
  const headers = {
    "Content-Type": "application/json",
    "apiKey": process.env.REACT_APP_API_KEY ?? "",
  };
 
  try {
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/accounts`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: headers,
    });
	if(response.ok) {
		const { token } = (await response.json()) as { token: string };
		localStorage.setItem("jwt_token", token);
    // return redirectDocument(process.env.REACT_APP_CODYZA_WEATHER_URL ?? "/");
	} else {
		(() => { throw new Error('Registration request failed.'); })();
	}
  } catch (error) {
    console.error("Registration request failed:", error);
    return {
      errors: ["Registration request failed. Please try again."],
      values: { email },
    };
  }
  return {
    success: "Registration request submitted successfully.",
    values: { email },
  };
}

const registrationRoute: RouteObject = {
  path: "/registration",
  element: React.createElement(RegistrationPage),
  action: registrationAction,
};

export default registrationRoute;
