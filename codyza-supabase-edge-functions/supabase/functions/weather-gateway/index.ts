// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
// import "@supabase/functions-js/edge-runtime.d.ts";

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
const jwtValidatorUrl = Deno.env.get("JWT_VALIDATOR_URL");
const gatewayInternalSecret = Deno.env.get("WEATHER_GATEWAY_INTERNAL_SECRET");
const CONTAINER_HOSTNAME = "host.docker.internal";

type LogLevel = "info" | "warn" | "error";

function deriveSiblingFunctionUrl(functionUrl: string | undefined, functionName: string): string | null {
  if (!functionUrl) {
    return null;
  }

  const parsedUrl = new URL(functionUrl);
  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  if (!pathSegments.length) {
    return null;
  }

  pathSegments[pathSegments.length - 1] = functionName;
  parsedUrl.pathname = `/${pathSegments.join("/")}`;
  return parsedUrl.toString();
}

const jwtRevokeUrl =
  Deno.env.get("JWT_REVOKE_URL") ??
  deriveSiblingFunctionUrl(jwtCreatorUrl, "jwt-revoke") ??
  deriveSiblingFunctionUrl(jwtValidatorUrl, "jwt-revoke");

function logGatewayEvent(level: LogLevel, event: string, details: Record<string, unknown> = {}) {
  const payload = {
    event,
    functionName: FUNCTION_NAME,
    ...details,
  };
  const message = `[weather-gateway] ${JSON.stringify(payload)}`;

  if (level === "error") {
    console.error(message);
    return;
  }

  if (level === "warn") {
    console.warn(message);
    return;
  }

  console.log(message);
}

function getHeaderPresence(req: Request) {
  return {
    hasApiKey: Boolean(req.headers.get("apikey")),
    hasAuthorization: Boolean(req.headers.get("authorization") ?? req.headers.get("Authorization")),
    hasGatewayCaller: Boolean(req.headers.get("x-weather-gateway-caller")),
    hasGatewaySecret: Boolean(req.headers.get("x-weather-gateway-secret")),
  };
}

function buildRequestLogContext(req: Request, requestId: string) {
  const requestUrl = new URL(req.url);

  return {
    requestId,
    method: req.method,
    pathname: requestUrl.pathname,
    search: requestUrl.search,
    origin: req.headers.get("origin"),
    ...getHeaderPresence(req),
  };
}

function summarizeBackendUrl(baseUrl: string) {
  const parsedUrl = new URL(baseUrl);

  return {
    backendOrigin: parsedUrl.origin,
    backendPathname: parsedUrl.pathname,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getConfiguredBackendsSummary() {
  return {
    hasRegistrationApiUrl: Boolean(registrationApiUrl),
    hasWeatherApiUrl: Boolean(weatherApiUrl),
    hasJwtCreatorUrl: Boolean(jwtCreatorUrl),
    hasJwtRevokeUrl: Boolean(jwtRevokeUrl),
    hasGatewayInternalSecret: Boolean(gatewayInternalSecret),
    registrationBackend: registrationApiUrl ? summarizeBackendUrl(registrationApiUrl) : null,
    weatherBackend: weatherApiUrl ? summarizeBackendUrl(weatherApiUrl) : null,
    jwtRevokeBackend: jwtRevokeUrl ? summarizeBackendUrl(jwtRevokeUrl) : null,
  };
}

function summarizeRequestBody(requestBody: Blob | null) {
  if (!requestBody) {
    return {
      hasBody: false,
      bodySize: 0,
      bodyType: null,
    };
  }

  return {
    hasBody: true,
    bodySize: requestBody.size,
    bodyType: requestBody.type || null,
  };
}

function summarizeBodyPayload(payload: unknown) {
  if (typeof payload === "string") {
    return {
      responseShape: "text",
      textLength: payload.length,
    };
  }

  if (Array.isArray(payload)) {
    return {
      responseShape: "array",
      itemCount: payload.length,
    };
  }

  if (payload && typeof payload === "object") {
    return {
      responseShape: "object",
      keys: Object.keys(payload).sort(),
    };
  }

  return {
    responseShape: payload === null ? "null" : typeof payload,
  };
}

function canResponseHaveBody(method: string, status: number) {
  return method !== "HEAD" && ![101, 103, 204, 205, 304].includes(status);
}

function summarizeForwardHeaders(headers: Headers) {
  return {
    hasApiKey: headers.has("apikey"),
    hasAuthorization: headers.has("authorization") || headers.has("Authorization"),
    hasUserId: headers.has("X-User-Id"),
    hasUserType: headers.has("X-User-Type"),
    hasUserPayload: headers.has("X-User-Payload"),
    hasGatewayCaller: headers.has("x-weather-gateway-caller"),
    hasGatewaySecret: headers.has("x-weather-gateway-secret"),
    contentType: headers.get("content-type"),
  };
}

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

  if (proxyPath.startsWith(`/${SERVICES.AUTH}`)) {
    return SERVICES.AUTH;
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

  if (service === SERVICES.AUTH) {
    return jwtRevokeUrl ?? null;
  }

  return registrationApiUrl ?? weatherApiUrl ?? null;
}

async function buildForwardBody(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") {
    return null;
  }

  return await req.blob();
}

function buildTargetUrl(baseUrl: string, proxyPath: string, search: string, service: SERVICES | null) {
  if (service === SERVICES.AUTH) {
    const targetUrl = new URL(baseUrl);
    targetUrl.search = search;
    return targetUrl;
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const parsedBaseUrl = new URL(normalizedBaseUrl);
  const baseSegments = parsedBaseUrl.pathname.split("/").filter(Boolean);
  const proxySegments = proxyPath.split("/").filter(Boolean);

  const normalizedProxyPath = baseSegments.length > 0 &&
      proxySegments.length > 0 &&
      baseSegments[baseSegments.length - 1] === proxySegments[0]
    ? proxySegments.slice(1).join("/")
    : proxySegments.join("/");

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

  if ((service === SERVICES.ACCOUNTS || service === SERVICES.AUTH) && gatewayInternalSecret) {
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
  requestId: string,
) {
  const headers = buildProxyHeaders(req, service, verifiedToken);

  logGatewayEvent("info", "proxy.forwarding.started", {
    requestId,
    targetUrl: targetUrl.toString(),
    ...summarizeForwardHeaders(headers),
    ...summarizeRequestBody(requestBody),
  });

  try {
    return await fetch(targetUrl, {
      method: req.method,
      headers,
      body: requestBody,
    });
  } catch (error) {
    const initialErrorMessage = getErrorMessage(error);
    const containerReachableBackendUrl = buildContainerReachableBackendUrl(backendBaseUrl);
    if (!containerReachableBackendUrl) {
      logGatewayEvent("error", "proxy.forwarding.failed", {
        requestId,
        targetUrl: targetUrl.toString(),
        usedContainerFallback: false,
        details: initialErrorMessage,
      });
      throw error;
    }

    const requestUrl = new URL(req.url);
    const containerTargetUrl = buildTargetUrl(
      containerReachableBackendUrl,
      extractProxyPath(requestUrl.pathname),
      requestUrl.search,
    );

    logGatewayEvent("warn", "proxy.forwarding.retrying-with-container-host", {
      requestId,
      targetUrl: targetUrl.toString(),
      fallbackTargetUrl: containerTargetUrl.toString(),
      details: initialErrorMessage,
    });

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

function buildProxiedResponse(
  req: Request,
  status: number,
  headers: Headers,
  body: unknown,
) {
  if (!canResponseHaveBody(req.method, status)) {
    headers.delete("content-length");
    headers.delete("content-type");
    return new Response(null, {
      status,
      headers,
    });
  }

  if (typeof body === "string") {
    return new Response(body, {
      status,
      headers,
    });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

async function appendTokenForAccountRoutes(
  req: Request,
  payload: unknown,
  requestBody: Blob | null,
) {
  if (!jwtCreatorUrl || !(payload && typeof payload === "object" && !Array.isArray(payload))) {
    return payload;
  }

  if (!gatewayInternalSecret) {
    throw new Error("Missing WEATHER_GATEWAY_INTERNAL_SECRET required for JWT creator forwarding.");
  }

  const jwtCreatorHeaders = new Headers(req.headers);
  const gatewayHeaders = buildWeatherGatewayHeaders(gatewayInternalSecret);
  Object.entries(gatewayHeaders).forEach(([key, value]) => {
    jwtCreatorHeaders.set(key, value);
  });

  const jwtResponse = await fetch(jwtCreatorUrl, {
    method: "POST",
    headers: jwtCreatorHeaders,
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
logGatewayEvent("info", "function.initialized", getConfiguredBackendsSummary());

export default {
  fetch: async (req: Request) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    logGatewayEvent("info", "request.received", buildRequestLogContext(req, requestId));

    if (req.method === "OPTIONS") {
      logGatewayEvent("info", "request.preflight", {
        requestId,
        pathname: new URL(req.url).pathname,
      });
      return new Response("ok", { headers: buildCorsHeaders(req) });
    }

    const requestUrl = new URL(req.url);
    const proxyPath = extractProxyPath(requestUrl.pathname);
    const matchedRoute = matchRoute(proxyPath);
    if (!matchedRoute) {
      logGatewayEvent("warn", "route.not-exposed", {
        requestId,
        proxyPath,
        method: req.method,
      });
      return jsonResponse(404, {
        error: "Endpoint not exposed by weather-gateway",
        path: proxyPath,
      }, req);
    }

    if (!matchedRoute.methods.includes(req.method)) {
      logGatewayEvent("warn", "route.method-not-allowed", {
        requestId,
        proxyPath,
        method: req.method,
        allowedMethods: matchedRoute.methods,
      });
      return jsonResponse(405, {
        error: "Method not allowed for endpoint",
        method: req.method,
        path: proxyPath,
      }, req);
    }

    const service = inferService(proxyPath);
    logGatewayEvent("info", "route.matched", {
      requestId,
      proxyPath,
      methods: matchedRoute.methods,
      service,
    });

    const backendBaseUrl = resolveBackendUrl(service);
    if (!backendBaseUrl) {
      logGatewayEvent("error", "backend.missing-url", {
        requestId,
        service,
        proxyPath,
      });
      return jsonResponse(500, {
        error: "Missing backend URL environment variable for requested service",
        service,
      }, req);
    }

    const requestBody = await buildForwardBody(req);
    const targetUrl = buildTargetUrl(backendBaseUrl, proxyPath, requestUrl.search, service);

    logGatewayEvent("info", "proxy.resolved", {
      requestId,
      proxyPath,
      service,
      targetUrl: targetUrl.toString(),
      ...summarizeRequestBody(requestBody),
      ...summarizeBackendUrl(backendBaseUrl),
    });

    try {
      let verifiedToken: VerifiedToken | null = null;
      if (service === SERVICES.WEATHER) {
        logGatewayEvent("info", "weather.validation.started", {
          requestId,
          proxyPath,
          ...getHeaderPresence(req),
        });

        const validationResult = await verifyTokenWithValidator(req, jsonResponse);
        const { errorResponse } = validationResult;
        if (errorResponse) {
          logGatewayEvent("warn", "weather.validation.failed", {
            requestId,
            proxyPath,
          });
          return errorResponse;
        }

        verifiedToken = validationResult.verifiedToken;
        logGatewayEvent("info", "weather.validation.succeeded", {
          requestId,
          proxyPath,
          tokenType: verifiedToken?.tokenType ?? null,
          hasSubject: Boolean(
            verifiedToken?.payload &&
              typeof verifiedToken.payload.sub === "string" &&
              verifiedToken.payload.sub.length > 0,
          ),
        });
      }

      const backendResponse = await fetchBackendResponse(
        req,
        service,
        verifiedToken,
        targetUrl,
        requestBody,
        backendBaseUrl,
        requestId,
      );

      if (service === SERVICES.AUTH) {
        logGatewayEvent("info", "auth.logout.forwarded", {
          requestId,
          proxyPath,
          targetUrl: targetUrl.toString(),
          status: backendResponse.status,
          ok: backendResponse.ok,
        });
      }

      const responseHeaders = buildResponseHeaders(backendResponse.headers, req);
      const responseBody = canResponseHaveBody(req.method, backendResponse.status)
        ? await parseBackendBody(backendResponse)
        : null;

      if (service === SERVICES.AUTH) {
        logGatewayEvent(backendResponse.ok ? "info" : "warn", "auth.logout.response", {
          requestId,
          proxyPath,
          status: backendResponse.status,
          ok: backendResponse.ok,
          ...summarizeBodyPayload(responseBody),
          responseBody,
        });
      }

      logGatewayEvent("info", "proxy.completed", {
        requestId,
        proxyPath,
        service,
        status: backendResponse.status,
        ok: backendResponse.ok,
        contentType: backendResponse.headers.get("content-type"),
        responseContentLength: backendResponse.headers.get("content-length"),
        ...summarizeBodyPayload(responseBody),
        durationMs: Date.now() - startedAt,
      });

      if (service === SERVICES.ACCOUNTS && backendResponse.ok) {
        const payloadWithToken = await appendTokenForAccountRoutes(req, responseBody, requestBody);

        logGatewayEvent("info", "accounts.token-appended", {
          requestId,
          proxyPath,
          tokenAdded: payloadWithToken !== responseBody,
          ...summarizeBodyPayload(payloadWithToken),
        });

        return buildProxiedResponse(
          req,
          backendResponse.status,
          responseHeaders,
          payloadWithToken,
        );
      }

      return buildProxiedResponse(
        req,
        backendResponse.status,
        responseHeaders,
        responseBody,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      logGatewayEvent("error", "proxy.failed", {
        requestId,
        proxyPath,
        service,
        durationMs: Date.now() - startedAt,
        details: message,
      });
      return jsonResponse(502, {
        error: "Gateway failed to reach destination server",
        details: message,
      }, req);
    }
  },
};
