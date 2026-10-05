const gatewayInternalSecret = Deno.env.get("WEATHER_GATEWAY_INTERNAL_SECRET");
export async function verifyTokenWithValidator(req) {
// const apiKey = req.headers.get("apikey");
// if (!apiKey) {
//   return {
//     verifiedToken: null,
//     errorResponse: jsonResponse(401, {
//       error: "Missing apikey header required for jwt-validator",
//     }),
//   };
// }
// if (!gatewayInternalSecret) {
//   return {
//     verifiedToken: null,
//     errorResponse: jsonResponse(500, {
//       error: "Missing WEATHER_GATEWAY_INTERNAL_SECRET environment variable",
//     }),
//   };
// }
// const validatorUrl = new URL(JWT_VALIDATOR_PATH, req.url);
//   let validatorResponse: Response;
//   try {
//     validatorResponse = await fetch(validatorUrl, {
//       method: "POST",
//       headers: {
//         apikey: apiKey,
//         Authorization: req.headers.get("Authorization") ?? "",
//         ...buildWeatherGatewayHeaders(gatewayInternalSecret),
//       },
//     });
//   } catch (error) {
//     const message = error instanceof Error ? error.message : String(error);
//     return {
//       verifiedToken: null,
//       errorResponse: jsonResponse(502, {
//         error: "Failed to reach jwt-validator",
//         details: message,
//       }),
//     };
//   }
//   let responseBody: unknown = null;
//   try {
//     responseBody = await validatorResponse.json();
//   } catch {
//     responseBody = null;
//   }
//   if (!validatorResponse.ok) {
//     return {
//       verifiedToken: null,
//       errorResponse: jsonResponse(
//         validatorResponse.status,
//         isRecord(responseBody)
//           ? responseBody
//           : { error: "jwt-validator rejected the token" },
//       ),
//     };
//   }
//   if (!isVerifiedToken(responseBody)) {
//     return {
//       verifiedToken: null,
//       errorResponse: jsonResponse(502, {
//         error: "jwt-validator returned an invalid response payload",
//       }),
//     };
//   }
//   return {
//     // verifiedToken: responseBody,
//     errorResponse: null,
//   };
}
