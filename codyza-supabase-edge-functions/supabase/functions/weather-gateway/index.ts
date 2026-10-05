// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";

import { buildWeatherGatewayHeaders } from "../_shared/weather-gateway-auth.ts";
import { buildForwardHeaders as buildWeatherForwardHeaders } from "./build-forward-headers.ts";
import { SERVICES } from "./models.ts";
import { supportedRoutes } from "./supported-routes.ts";
import type { VerifiedToken } from "./utils.ts";
import { verifyTokenWithValidator } from "./verify-token-validator.ts";

console.log("Weather Gateway init");

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "accept",
    "origin",
    "x-weather-gateway-caller",
    "x-weather-gateway-secret",
  ].join(", "),
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const FUNCTION_NAME = "weather-gateway";
const FUNCTION_BASE_PATH = `/functions/v1/${FUNCTION_NAME}`;
const FUNCTION_PATH_PREFIXES = [FUNCTION_BASE_PATH, `/${FUNCTION_NAME}`];
const registrationApiUrl =
  Deno.env.get("WEATHER_REGISTRATION_API_URL") ??
  Deno.env.get("REGISTRATION_API_URL");
const weatherApiUrl =
  Deno.env.get("WEATHER_API_URL") ??
  Deno.env.get("NEST_WEATHER_API_URL") ??
  Deno.env.get("BACKEND_URL");
const jwtCreatorUrl = Deno.env.get("JWT_CREATOR_URL");
const gatewayInternalSecret = Deno.env.get("WEATHER_GATEWAY_INTERNAL_SECRET");
const CONTAINER_HOSTNAME = "host.docker.internal";

function buildCorsHeaders(req?: Request) {
  const requestOrigin = req?.headers.get("origin");
  const requestedHeaders = req?.headers.get("access-control-request-headers");

  return {
    ...defaultCorsHeaders,
    "Access-Control-Allow-Origin": requestOrigin ?? defaultCorsHeaders["Access-Control-Allow-Origin"],
    "Access-Control-Allow-Headers": requestedHeaders ?? defaultCorsHeaders["Access-Control-Allow-Headers"],
    Vary: "Origin, Access-Control-Request-Headers",
  };
}

function jsonResponse(status: number, body: unknown, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function extractProxyPath(pathname: string) {
  for (const prefix of FUNCTION_PATH_PREFIXES) {
    if (!pathname.startsWith(prefix)) {
      continue;
    }

    const remainder = pathname.slice(prefix.length);
    return remainder.length > 0 ? remainder : "/";
  }

  return pathname;
}

function matchRoute(pathname: string) {
  return supportedRoutes.find((route) => route.pattern.test(pathname));
}

function inferService(proxyPath: string): SERVICES | null {
  if (proxyPath.startsWith(`/${SERVICES.ACCOUNTS}`)) {
    return SERVICES.ACCOUNTS;
  }

  if (proxyPath.startsWith(`/${SERVICES.WEATHER}`)) {
    return SERVICES.WEATHER;
  }

  return null;
}

function resolveBackendUrl(service: SERVICES | null): string | null {
  if (service === SERVICES.ACCOUNTS) {
    return registrationApiUrl ?? null;
  }

  if (service === SERVICES.WEATHER) {
    return weatherApiUrl ?? null;
  }

  return registrationApiUrl ?? weatherApiUrl ?? null;
}

async function buildForwardBody(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") {
    return null;
  }

  return await req.blob();
}

function buildTargetUrl(baseUrl: string, proxyPath: string, search: string) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedProxyPath = proxyPath.replace(/^\/+/, "");
  const targetUrl = new URL(normalizedProxyPath, normalizedBaseUrl);
  targetUrl.search = search;
  return targetUrl;
}

function buildContainerReachableBackendUrl(baseUrl: string) {
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
    return null;
  }

  parsedUrl.hostname = CONTAINER_HOSTNAME;
  return parsedUrl.toString();
}

function buildProxyHeaders(
  req: Request,
  service: SERVICES | null,
  verifiedToken: VerifiedToken | null,
) {
  const headers = service === SERVICES.WEATHER && verifiedToken
    ? buildWeatherForwardHeaders(req, verifiedToken.payload, verifiedToken.tokenType)
    : new Headers(req.headers);

  headers.delete("host");
  headers.delete("content-length");

  if (service === SERVICES.ACCOUNTS && gatewayInternalSecret) {
    const gatewayHeaders = buildWeatherGatewayHeaders(gatewayInternalSecret);
    Object.entries(gatewayHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  return headers;
}

async function fetchBackendResponse(
  req: Request,
  service: SERVICES | null,
  verifiedToken: VerifiedToken | null,
  targetUrl: URL,
  requestBody: Blob | null,
  backendBaseUrl: string,
) {
  const headers = buildProxyHeaders(req, service, verifiedToken);

  try {
    return await fetch(targetUrl, {
      method: req.method,
      headers,
      body: requestBody,
    });
  } catch (error) {
    const containerReachableBackendUrl = buildContainerReachableBackendUrl(backendBaseUrl);
    if (!containerReachableBackendUrl) {
      throw error;
    }

    const requestUrl = new URL(req.url);
    const containerTargetUrl = buildTargetUrl(
      containerReachableBackendUrl,
      extractProxyPath(requestUrl.pathname),
      requestUrl.search,
    );

    return await fetch(containerTargetUrl, {
      method: req.method,
      headers,
      body: requestBody,
    });
  }
}

async function parseBackendBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }

  return await response.text();
}

function buildResponseHeaders(sourceHeaders: Headers, req?: Request) {
  const responseHeaders = new Headers(sourceHeaders);
  Object.entries(buildCorsHeaders(req)).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });
  return responseHeaders;
}

async function appendTokenForAccountRoutes(
  req: Request,
  payload: unknown,
  requestBody: Blob | null,
) {
  if (!jwtCreatorUrl || !(payload && typeof payload === "object" && !Array.isArray(payload))) {
    return payload;
  }

  const jwtResponse = await fetch(jwtCreatorUrl, {
    method: "POST",
    headers: new Headers(req.headers),
    body: requestBody,
  });

  if (!jwtResponse.ok) {
    throw new Error(`Failed to obtain JWT from JWT_CREATOR_URL: ${jwtResponse.status} ${jwtResponse.statusText}`);
  }

  const jwtPayload = await jwtResponse.json();
  return {
    ...payload,
    token: jwtPayload.token,
  };
}

console.log("Weather Gateway initialized");

export default {
  fetch: async (req: Request) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: buildCorsHeaders(req) });
    }

    const requestUrl = new URL(req.url);
    const proxyPath = extractProxyPath(requestUrl.pathname);
    const matchedRoute = matchRoute(proxyPath);
    if (!matchedRoute) {
      return jsonResponse(404, {
        error: "Endpoint not exposed by weather-gateway",
        path: proxyPath,
      }, req);
    }

    if (!matchedRoute.methods.includes(req.method)) {
      return jsonResponse(405, {
        error: "Method not allowed for endpoint",
        method: req.method,
        path: proxyPath,
      }, req);
    }

    const service = inferService(proxyPath);
    const backendBaseUrl = resolveBackendUrl(service);
    if (!backendBaseUrl) {
      return jsonResponse(500, {
        error: "Missing backend URL environment variable for requested service",
        service,
      }, req);
    }

    const requestBody = await buildForwardBody(req);
    const targetUrl = buildTargetUrl(backendBaseUrl, proxyPath, requestUrl.search);

    try {
      let verifiedToken: VerifiedToken | null = null;
      if (service === SERVICES.WEATHER) {
        const validationResult = await verifyTokenWithValidator(req, jsonResponse);
        const { errorResponse } = validationResult;
        if (errorResponse) {
          return errorResponse;
        }

        verifiedToken = validationResult.verifiedToken;
      }

      const backendResponse = await fetchBackendResponse(
        req,
        service,
        verifiedToken,
        targetUrl,
        requestBody,
        backendBaseUrl,
      );
      const responseHeaders = buildResponseHeaders(backendResponse.headers, req);
      const responseBody = await parseBackendBody(backendResponse);

      if (service === SERVICES.ACCOUNTS && backendResponse.ok) {
        const payloadWithToken = await appendTokenForAccountRoutes(req, responseBody, requestBody);
        return new Response(JSON.stringify(payloadWithToken), {
          status: backendResponse.status,
          headers: responseHeaders,
        });
      }

      if (typeof responseBody === "string") {
        return new Response(responseBody, {
          status: backendResponse.status,
          headers: responseHeaders,
        });
      }

      return new Response(JSON.stringify(responseBody), {
        status: backendResponse.status,
        headers: responseHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Gateway proxy error:", message);
      return jsonResponse(502, {
        error: "Gateway failed to reach destination server",
        details: message,
      }, req);
    }
  },
};
