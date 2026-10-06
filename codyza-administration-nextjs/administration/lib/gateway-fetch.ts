const RETRYABLE_GATEWAY_STATUS_CODES = new Set([502, 503, 504]);
const DEFAULT_GATEWAY_FETCH_ATTEMPTS = 3;
const DEFAULT_GATEWAY_RETRY_DELAY_MS = 250;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGatewayWithRetry(
  input: string,
  init: RequestInit,
  options?: {
    attempts?: number;
    retryDelayMs?: number;
  },
) {
  const attempts = Math.max(1, options?.attempts ?? DEFAULT_GATEWAY_FETCH_ATTEMPTS);
  const retryDelayMs = Math.max(0, options?.retryDelayMs ?? DEFAULT_GATEWAY_RETRY_DELAY_MS);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_GATEWAY_STATUS_CODES.has(response.status) || attempt === attempts) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        throw error;
      }
    }

    await delay(retryDelayMs * attempt);
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Gateway request failed after retries.");
}
