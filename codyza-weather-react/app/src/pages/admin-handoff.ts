import { redirectDocument } from "react-router-dom";

import { appConfig } from "../config/environment";

type AdminAccessResponse = {
  email: string;
  passwordSetupRequired?: boolean;
};

function buildAdminCreatePasswordUrl(email: string): string | null {
  if (!appConfig.adminAppUrl) {
    return null;
  }

  const normalizedBaseUrl = appConfig.adminAppUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/create-password?email=${encodeURIComponent(email)}`;
}

function buildAdminLoginUrl(email: string): string | null {
  if (!appConfig.adminAppUrl) {
    return null;
  }

  const normalizedBaseUrl = appConfig.adminAppUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/login?email=${encodeURIComponent(email)}`;
}

type AdminRedirectIntent = "login" | "registration" | "reset-password";

export async function redirectIfAdministrator(
  email: string,
  intent: AdminRedirectIntent,
): Promise<Response | null> {
  const adminAccessResponse = await fetch(
    `${process.env.REACT_APP_API_BASE_URL}/admin/access`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
        "apiKey": process.env.REACT_APP_API_KEY ?? "",
      },
    },
  );

  if (!adminAccessResponse.ok) {
    return null;
  }

  const { email: adminEmail, passwordSetupRequired } = (await adminAccessResponse.json()) as AdminAccessResponse;
  const adminRedirectUrl = passwordSetupRequired || intent !== "login"
    ? buildAdminCreatePasswordUrl(adminEmail)
    : buildAdminLoginUrl(adminEmail);
  if (!adminRedirectUrl) {
    throw new Error("This account is an administrator, but REACT_APP_ADMIN_APP_URL is not configured.");
  }

  return redirectDocument(adminRedirectUrl);
}
