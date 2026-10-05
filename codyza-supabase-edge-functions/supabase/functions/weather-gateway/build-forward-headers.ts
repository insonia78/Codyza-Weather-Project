export function buildForwardHeaders(req, payload, tokenType) {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  // headers.set("X-User-Id", getPayloadStringValue(payload, "sub"));
  // headers.set("X-User-Type", tokenType);
  // headers.set("X-User-Payload", JSON.stringify(payload));
  return headers;
}
function getPayloadStringValue(payload, key) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}
