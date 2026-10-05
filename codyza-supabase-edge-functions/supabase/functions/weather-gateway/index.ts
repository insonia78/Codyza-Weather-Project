// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import { SERVICES } from "./models.ts";
import { supportedRoutes } from "./supported-routes.ts";

console.log("Weather Gateway init");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
};

const FUNCTION_NAME = "weather-gateway";
const FUNCTION_BASE_PATH = `/functions/v1/${FUNCTION_NAME}`;
const FUNCTION_PATH_PREFIXES = [FUNCTION_BASE_PATH, `/${FUNCTION_NAME}`];
const backendUrl = Deno.env.get("WEATHER_REGISTRATION_API_URL") ?? Deno.env.get("BACKEND_URL");
const CONTAINER_HOSTNAME = "host.docker.internal";



function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
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

function buildForwardHeaders(req: Request) {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  return headers;
}

async function fetchBackendResponse(req: Request, targetUrl: URL, requestBody: Blob | null) {
  try {
    return await fetch(targetUrl, {
      method: req.method,
      headers: buildForwardHeaders(req),
      body: requestBody
    });
  } catch (error) {
    const containerReachableBackendUrl = buildContainerReachableBackendUrl(backendUrl as string);
    if (!containerReachableBackendUrl) {
      throw error;
    }

    const requestUrl = new URL(req.url);
    const containerTargetUrl = buildTargetUrl(
      containerReachableBackendUrl,
      extractProxyPath(requestUrl.pathname),
      requestUrl.search
    );

    return await fetch(containerTargetUrl, {
      method: req.method,
      headers: buildForwardHeaders(req),
      body: requestBody
    });
  }
}

async function buildGatewayResponse(
  req: Request,
  proxyPath: string,
  requestBody:any = null
) {

  const response = await fetch(proxyPath, {
    method: "POST",
    headers: buildForwardHeaders(req),
    body: requestBody
  });
  if (!response.ok) {
    throw new Error(`Failed to obtain JWT from JWT_CREATOR_URL: ${response.status} ${response.statusText}`);
  }

  return await response.json(); 
}

console.log("Weather Gateway initialized");




export default {
  async fetch(req: Request) {
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
      if(proxyPath.includes(SERVICES.WEATHER)) {
            const jwtValidatorUrl = Deno.env.get("JWT_VALIDATOR_URL");
            console.log(`Authorization header: ${req.headers}`);
            const { authorization }:any = req.headers;
            if (!jwtValidatorUrl) {
              throw new Error("Missing JWT_VALIDATOR_URL environment variable");
            }
            buildGatewayResponse(req, proxyPath, authorization);

      }
      const backendResponse = await fetchBackendResponse(req, targetUrl, requestBody);
      
      if(proxyPath.includes(SERVICES.ACCOUNTS)) {
         const response =  await buildGatewayResponse(req, proxyPath, backendResponse);
         (backendResponse as any).token = response.token;
      } else {
        return  new Response(JSON.stringify(backendResponse), {
          status: backendResponse.status,
          headers: backendResponse.headers
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Gateway proxy error:", message);
      return jsonResponse(502, {
        error: "Gateway failed to reach destination server",
        details: message
      });
    }
  }
};

/* To invoke locally:

  1. Run `supabase start` and start the FastAPI app at WEATHER_REGISTRATION_API_URL.
     If the API runs on your host machine, set WEATHER_REGISTRATION_API_URL to
     `http://host.docker.internal:8000` because the local Supabase Edge Runtime
     runs inside Docker.

  2. Make HTTP requests:

  curl -i --location --request GET 'http://127.0.0.1:54331/functions/v1/weather-gateway/health' \
    --header 'apiKey: sb_publishable_your_key'

  curl -i --location --request POST 'http://127.0.0.1:54331/functions/v1/weather-gateway/accounts/' \
    --header 'apiKey: sb_publishable_your_key' \
    --header 'Content-Type: application/json' \
    --data '{"username":"demo","email":"demo@example.com","password":"secret123"}'

*/
