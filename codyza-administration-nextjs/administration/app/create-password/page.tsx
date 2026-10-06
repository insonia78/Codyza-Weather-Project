import { redirect } from "next/navigation";

import { CreatePasswordForm } from "./password-form";
import { getAdminSessionFromCookies, isAdminSessionAuthorized } from "../../lib/admin-session";

export const dynamic = "force-dynamic";

export default async function CreatePasswordPage() {
  const session = await getAdminSessionFromCookies();
  if (isAdminSessionAuthorized(session)) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="admin-eyebrow">Codyza Weather</p>
        <h1>Create administrator password</h1>
        <p className="admin-subtext">
          Create a password with at least 8 characters for the administrator account already stored in the accounts database. After creation, the administration app signs you in and stores the JWT session automatically.
        </p>
        <CreatePasswordForm />
      </section>
    </main>
  );
}
