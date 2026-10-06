import React from "react";
import { redirectDocument, type ActionFunctionArgs, type RouteObject } from "react-router-dom";
import { redirectIfAdministrator } from "../admin-handoff";
import LoginPage from "./index";
import { validateLoginForm } from "./functions";

export type LoginActionData = {
  errors?: string[];
  success?: string;
  values?: {
    email: string;
  };
};

export async function loginAction({
  request,
}: ActionFunctionArgs): Promise<LoginActionData | Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email.trim()) {
    return {
      errors: ["Email is required."],
      values: { email },
    };
  }

  try {
    const adminRedirect = await redirectIfAdministrator(email);
    if (adminRedirect) {
      return adminRedirect;
    }

    const errors = validateLoginForm({ email, password });
    if (errors.length > 0) {
      return {
        errors,
        values: { email },
      };
    }

    const response = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/accounts/login`,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: {
          "Content-Type": "application/json",
          "apiKey": process.env.REACT_APP_API_KEY ?? "",
        },
      },
    );

    if (response.ok) {
      const { token } = (await response.json()) as { token: string };
      localStorage.setItem("jwt_token", token);

      return redirectDocument(process.env.REACT_APP_CODYZA_WEATHER_URL ?? "/");
    }

    throw new Error("Login request failed.");
  } catch (error) {
    console.error("Login request failed:", error);
    return {
      errors: [error instanceof Error ? error.message : "Login request failed. Please try again."],
      values: { email },
    };
  }
}

const loginRoute: RouteObject = {
  path: "/login",
  element: React.createElement(LoginPage),
  action: loginAction,
};

export default loginRoute;
