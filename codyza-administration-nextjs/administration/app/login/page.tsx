import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getAdminSessionFromCookies, isAdminSessionAuthorized } from "../../lib/admin-session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAdminSessionFromCookies();
  if (isAdminSessionAuthorized(session)) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="admin-eyebrow">Codyza Weather</p>
        <h1>Administration login</h1>
        <p className="admin-subtext">
          Enter the administrator email stored in the accounts database. If the account has not created a password yet, you will be redirected to create one before the app stores a gateway-issued JWT session cookie.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
