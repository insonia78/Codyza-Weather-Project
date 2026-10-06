const adminAuthRealm = "Codyza Weather Admin";

function getConfiguredAdminCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim() || "";
  const password = process.env.ADMIN_PASSWORD?.trim() || "";

  return {
    username,
    password,
    configured: Boolean(username && password),
  };
}

export function isAdminAuthConfigured(): boolean {
  return getConfiguredAdminCredentials().configured;
}

export function isAuthorizedAdminRequest(authorizationHeader: string | null): boolean {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return false;
  }

  const { username, password, configured } = getConfiguredAdminCredentials();
  if (!configured) {
    return false;
  }

  const expectedCredentials = btoa(`${username}:${password}`);
  return authorizationHeader.slice("Basic ".length) === expectedCredentials;
}

export function getAdminAuthChallengeHeader(): string {
  return `Basic realm="${adminAuthRealm}", charset="UTF-8"`;
}
