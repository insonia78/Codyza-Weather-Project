import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getAdminSessionFromCookies, isAdminSessionAuthorized } from "../../lib/admin-session";
import { CodyzaBranding } from "../components/branding";

export const dynamic = "force-dynamic";

const defaultRootAppUrl = "https://codyza-weather-project-17oc.vercel.app";

export default async function LoginPage() {
  const session = await getAdminSessionFromCookies();
  if (isAdminSessionAuthorized(session)) {
    redirect("/");
  }

  const rootAppBaseUrl = process.env.NEXT_PUBLIC_ROOT_APP_URL?.trim().replace(/\/+$/, "") || defaultRootAppUrl;
  const rootLoginUrl = `${rootAppBaseUrl}/login`;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <CodyzaBranding compact={true} showPoweredBy={false} />
        <p className="admin-eyebrow">Codyza Weather</p>
        <h1>Administration login</h1>
        <p className="admin-subtext">
          Enter the administrator email stored in the accounts database. If the account has not created a password yet, you will be redirected to create one before the app stores a gateway-issued JWT session cookie.
        </p>
        <LoginForm />
        <div className="auth-links">
          <a className="auth-link" href={rootLoginUrl}>
            Go to the user login page
          </a>
        </div>
        <p className="brand-powered">Powered by Codyza</p>
      </section>
    </main>
  );
}
