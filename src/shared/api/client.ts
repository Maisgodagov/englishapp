export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestConfig<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function apiFetch<TResponse, TBody = unknown>(
  endpoint: string,
  { method = 'GET', body, token, headers = {}, signal }: RequestConfig<TBody> = {},
): Promise<TResponse> {
  const requestHeaders = new Headers({ 'Content-Type': 'application/json', ...headers });
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

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
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}


