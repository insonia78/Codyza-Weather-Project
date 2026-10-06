// import "@supabase/functions-js/edge-runtime.d.ts";
import { jwtVerify } from "npm:jose@5";
import {
  isJwtTokenDatabaseConfigured,
  jwtTokenDatabaseUrlEnvVar,
  revokeJwtTokenRecord,
} from "../_shared/jwt-token-store.ts";
import {
  authorizeWeatherGatewayRequest,
  weatherGatewayCallerHeader,
  weatherGatewaySecretHeader,
} from "../_shared/weather-gateway-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": `authorization, x-client-info, apikey, content-type, ${weatherGatewayCallerHeader}, ${weatherGatewaySecretHeader}`,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const customJwtSecret = Deno.env.get("MY_JWT_SECRET") ?? Deno.env.get("CUSTOM_JWT_SECRET");
const encoder = new TextEncoder();

type RevokeTokenRequestBody = {
  tokenId?: string;
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isRevokeTokenRequestBody(value: unknown): value is RevokeTokenRequestBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.tokenId === "undefined" || typeof candidate.tokenId === "string";
}

async function getTokenIdFromAuthorizationHeader(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  if (!customJwtSecret) {
    throw new Error("Missing MY_JWT_SECRET or CUSTOM_JWT_SECRET environment variable.");
  }

  const token = authorization.slice("Bearer ".length);
  const verified = await jwtVerify(token, encoder.encode(customJwtSecret));
  const tokenId = verified.payload.jti;
  return typeof tokenId === "string" && tokenId.trim() ? tokenId : null;
}

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse(405, {
        error: "Method not allowed",
        method: req.method,
      });
    }

    const gatewayAuthorizationError = authorizeWeatherGatewayRequest(req, jsonResponse, "jwt-revoke");
    if (gatewayAuthorizationError) {
      return gatewayAuthorizationError;
    }

    if (!isJwtTokenDatabaseConfigured()) {
      return jsonResponse(500, {
        error: `Missing ${jwtTokenDatabaseUrlEnvVar} environment variable`,
      });
    }

    try {
      const requestBody = await req.json();
      if (!isRevokeTokenRequestBody(requestBody)) {
        return jsonResponse(400, {
          error: "Request body must be a JSON object with an optional string tokenId field.",
        });
      }

      const explicitTokenId = typeof requestBody.tokenId === "string" ? requestBody.tokenId.trim() : "";
      const tokenId = explicitTokenId || await getTokenIdFromAuthorizationHeader(req);
      if (!tokenId) {
        return jsonResponse(400, {
          error: "Provide tokenId in the request body or a valid Bearer token in the Authorization header.",
        });
      }

      const revokedToken = await revokeJwtTokenRecord(tokenId);
      if (!revokedToken) {
        return jsonResponse(404, {
          error: "JWT token record was not found or has already been revoked.",
        });
      }

      return jsonResponse(200, {
        revoked: true,
        tokenId: revokedToken.tokenId,
        revokedAt: revokedToken.revokedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResponse(400, {
        error: message,
      });
    }
  },
}; /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Call this function through weather-gateway with WEATHER_GATEWAY_INTERNAL_SECRET configured.

*/
