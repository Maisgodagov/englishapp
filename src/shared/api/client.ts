import Constants from 'expo-constants';
import { addDebugLog } from '@shared/debugLog';

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestConfig<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// Get API URL from environment variable or expo config
const API_URL_FROM_ENV = process.env.EXPO_PUBLIC_API_URL;
const API_URL_FROM_EXTRA = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;
const API_URL_FALLBACK = 'http://localhost:3001/api';

const API_URL = API_URL_FROM_ENV ?? API_URL_FROM_EXTRA ?? API_URL_FALLBACK;

// Detailed logging
console.log('[API Client] ===== API Configuration =====');
console.log('[API Client] process.env.EXPO_PUBLIC_API_URL:', API_URL_FROM_ENV);
console.log('[API Client] Constants.expoConfig.extra.EXPO_PUBLIC_API_URL:', API_URL_FROM_EXTRA);
console.log('[API Client] Constants.expoConfig.extra:', Constants.expoConfig?.extra);
console.log('[API Client] Final API_URL:', API_URL);
console.log('[API Client] ================================');

addDebugLog('info', 'API Client initialized', {
  fromEnv: API_URL_FROM_ENV,
  fromExtra: API_URL_FROM_EXTRA,
  finalUrl: API_URL,
  platform: Constants.platform,
});

export async function apiFetch<TResponse, TBody = unknown>(
  endpoint: string,
  { method = 'GET', body, token, headers = {}, signal }: RequestConfig<TBody> = {},
): Promise<TResponse> {
  const fullUrl = `${API_URL}/${endpoint}`;

  addDebugLog('info', `API Request: ${method} ${endpoint}`, {
    fullUrl,
    method,
    hasBody: !!body,
    hasToken: !!token,
  });

  const requestHeaders = new Headers({ 'Content-Type': 'application/json', ...headers });
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    addDebugLog('info', `API Response: ${method} ${endpoint}`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addDebugLog('error', `API Network Error: ${method} ${endpoint}`, {
      error: errorMessage,
      fullUrl,
      apiUrl: API_URL,
    });
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText || 'Request failed';
    try {
      const parsed = JSON.parse(errorText);
      if (parsed && typeof parsed === 'object' && 'message' in parsed) {
        message = String(parsed.message);
      }
    } catch {
      // ignore JSON parse errors
    }

    addDebugLog('error', `API Error Response: ${method} ${endpoint}`, {
      status: response.status,
      message,
      errorText,
    });

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}


