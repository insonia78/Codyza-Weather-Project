import postgres from "npm:postgres";

export const jwtTokenDatabaseUrlEnvVar = "JWT_TOKEN_DATABASE_URL";
export const jwtTokenTableName = "jwt_tokens";

export type PersistedJwtTokenRecord = {
  tokenId: string;
  tokenSha: string;
  userId: string;
  role: string;
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

type SqlClient = ReturnType<typeof postgres>;

export function getJwtTokenDatabaseUrl(): string | null {
  const databaseUrl = Deno.env.get(jwtTokenDatabaseUrlEnvVar)?.trim();
  return databaseUrl ? databaseUrl : null;
}

export function isJwtTokenDatabaseConfigured(): boolean {
  return Boolean(getJwtTokenDatabaseUrl());
}

export async function withJwtTokenDatabase<T>(
  callback: (sql: SqlClient) => Promise<T>,
): Promise<T> {
  const databaseUrl = getJwtTokenDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(`Missing ${jwtTokenDatabaseUrlEnvVar} environment variable.`);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 5,
  });

  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function saveJwtTokenRecord(record: PersistedJwtTokenRecord): Promise<void> {
  await withJwtTokenDatabase(async (sql) => {
    await sql`
      insert into jwt_tokens (
        token_id,
        token_sha,
        user_id,
        role,
        issuer,
        issued_at,
        expires_at,
        revoked_at
      ) values (
        ${record.tokenId},
        ${record.tokenSha},
        ${record.userId},
        ${record.role},
        ${record.issuer},
        ${record.issuedAt},
        ${record.expiresAt},
        ${record.revokedAt}
      )
    `;
  });
}

export async function findJwtTokenRecordById(tokenId: string): Promise<PersistedJwtTokenRecord | null> {
  return await withJwtTokenDatabase(async (sql) => {
    const rows = await sql<PersistedJwtTokenRecord[]>`
      select
        token_id as "tokenId",
        token_sha as "tokenSha",
        user_id as "userId",
        role,
        issuer,
        issued_at as "issuedAt",
        expires_at as "expiresAt",
        revoked_at as "revokedAt"
      from jwt_tokens
      where token_id = ${tokenId}
      limit 1
    `;

    return rows[0] ?? null;
  });
}

export async function revokeJwtTokenRecord(
  tokenId: string,
  revokedAt = Math.floor(Date.now() / 1000),
): Promise<PersistedJwtTokenRecord | null> {
  return await withJwtTokenDatabase(async (sql) => {
    const rows = await sql<PersistedJwtTokenRecord[]>`
      update jwt_tokens
      set revoked_at = ${revokedAt}
      where token_id = ${tokenId}
        and revoked_at is null
      returning
        token_id as "tokenId",
        token_sha as "tokenSha",
        user_id as "userId",
        role,
        issuer,
        issued_at as "issuedAt",
        expires_at as "expiresAt",
        revoked_at as "revokedAt"
    `;

    return rows[0] ?? null;
  });
}
