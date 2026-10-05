export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Content-Type": "application/json"
    }
  });
}
export function isRecord(value) {
  return typeof value === "object" && value !== null;
}
export function isVerifiedToken(value) {
  if (!isRecord(value)) {
    return false;
  }
  return isRecord(value.payload) && (value.tokenType === "supabase" || value.tokenType === "custom");
}
