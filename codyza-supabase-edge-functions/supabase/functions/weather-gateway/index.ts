// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { supportedRoutes } from "./supported-routes.ts";
console.log("Weather Gateway init");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
};
const FUNCTION_NAME = "weather-gateway";
const FUNCTION_BASE_PATH = `/functions/v1/${FUNCTION_NAME}`;
const JWT_VALIDATOR_PATH = "/functions/v1/jwt-validator";
const backendUrl = Deno.env.get("WEATHER_REGISTRATION_API_URL") ?? Deno.env.get("BACKEND_URL");
const CONTAINER_HOSTNAME = "host.docker.internal";
var SERVICES;
(function(SERVICES) {
  SERVICES["ACCOUNTS"] = "accounts";
})(SERVICES || (SERVICES = {}));
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
const PROXY_PATH_PREFIX = "weather-gateway";
function extractProxyPath(pathname) {
  let segments = pathname.split("/");
  segments = segments.filter((segment)=>segment !== PROXY_PATH_PREFIX);
  const proxyPath = segments.join("/");
  return proxyPath;
}
function matchRoute(pathname) {
  return supportedRoutes.find((route)=>route.pattern.test(pathname));
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function isVerifiedToken(value) {
  if (!isRecord(value)) {
    return false;
  }
  return isRecord(value.payload) && (value.tokenType === "supabase" || value.tokenType === "custom");
}
async function buildForwardBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return null;
  }
  return await req.blob();
}
function buildTargetUrl(baseUrl, proxyPath, search) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedProxyPath = proxyPath.replace(/^\/+/, "");
  const targetUrl = new URL(normalizedProxyPath, normalizedBaseUrl);
  targetUrl.search = search;
  return targetUrl;
}
function buildContainerReachableBackendUrl(baseUrl) {
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
    return null;
  }
  parsedUrl.hostname = CONTAINER_HOSTNAME;
  return parsedUrl.toString();
}
console.log("Weather Gateway initialized");
export default {
  fetch: withSupabase({
    auth: [
      "publishable",
      "secret"
    ]
  }, async (req)=>{
    console.log(`Incoming request: ${req.method} ${req.url}`);
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders
      });
    }
    if (!backendUrl) {
      return jsonResponse(500, {
        error: "Missing WEATHER_REGISTRATION_API_URL or BACKEND_URL environment variable"
      });
    }
    const requestUrl = new URL(req.url);
    const proxyPath = extractProxyPath(requestUrl.pathname);
    const matchedRoute = matchRoute(proxyPath);
    if (!matchedRoute) {
      return jsonResponse(404, {
        error: "Endpoint not exposed by weather-gateway",
        path: proxyPath
      });
    }
    if (!matchedRoute.methods.includes(req.method)) {
      return jsonResponse(405, {
        error: "Method not allowed for endpoint",
        method: req.method,
        path: proxyPath
      });
    }
    const requestBody = await buildForwardBody(req);
    const targetUrl = buildTargetUrl(backendUrl, proxyPath, requestUrl.search);
    try {
      let backendResponse;
      try {
        backendResponse = await fetch(targetUrl, {
          method: req.method,
          headers: new Headers(req.headers),
          body: requestBody
        });
      } catch (error) {
        const containerReachableBackendUrl = buildContainerReachableBackendUrl(backendUrl);
      }
      const backendResponseJson = await backendResponse.json();
      if (proxyPath.startsWith(`/${SERVICES.ACCOUNTS}`)) {
        const response = await fetch(Deno.env.get("JWT_CREATOR_URL"), {
          method: "POST",
          headers: new Headers(req.headers),
          body: requestBody
        });
        if (response.ok) backendResponseJson.token = (await response.json()).token;
        else throw new Error("Failed to obtain JWT from JWT_CREATOR_URL");
      }
      const responseHeaders = new Headers(backendResponse.headers);
      Object.entries(corsHeaders).forEach(([key, value])=>{
        responseHeaders.set(key, value);
      });
      console.log("Backend response body:", new Response(JSON.stringify(backendResponseJson), {
        status: backendResponse.status,
        headers: responseHeaders
      }));
      return new Response(JSON.stringify(backendResponseJson), {
        status: backendResponse.status,
        headers: responseHeaders
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Gateway proxy error:", message);
      return jsonResponse(502, {
        error: "Gateway failed to reach destination server",
        details: message
      });
    }
  })
}; /* To invoke locally:

  1. Run `supabase start` and start the FastAPI app at WEATHER_REGISTRATION_API_URL.
     If the API runs on your host machine, set WEATHER_REGISTRATION_API_URL to
     `http://host.docker.internal:8000` because the local Supabase Edge Runtime
     runs inside Docker.

  2. Make HTTP requests:

  curl -i --location --request GET 'http://127.0.0.1:54331/functions/v1/weather-gateway/health' \
    --header 'apiKey: sb_publishable_your_key' \
    --header 'Authorization: Bearer <jwt>'

  curl -i --location --request POST 'http://127.0.0.1:54331/functions/v1/weather-gateway/accounts/' \
    --header 'apiKey: sb_publishable_your_key' \
    --header 'Authorization: Bearer <jwt>' \
    --header 'Content-Type: application/json' \
    --data '{"username":"demo","email":"demo@example.com","password":"secret123"}'

*/ 
