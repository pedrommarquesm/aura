import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { ApiError, NetworkError } from './errors';
import type { AuthTokens } from './types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions = {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  /** Send without an `Authorization` header and skip the 401 refresh path. */
  anonymous?: boolean;
  timeoutMs?: number;
};

/**
 * How the client reaches the session. Registered once at startup so the client
 * never imports the store — the store stays the only thing that knows about
 * SecureStore, and the two modules do not form a cycle.
 */
export type SessionBridge = {
  /** The access token currently in memory, or null when browsing as a guest. */
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  onTokensRotated: (tokens: AuthTokens) => Promise<void> | void;
  onSessionExpired: () => Promise<void> | void;
};

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null) search.append(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `${url}?${serialized}` : url;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const envelope = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  const code = typeof envelope?.code === 'string' ? envelope.code : 'unknown_error';
  const message =
    typeof envelope?.message === 'string' ? envelope.message : `Request failed (${status})`;

  return new ApiError(status, code, message);
}

class ApiClient {
  private bridge: SessionBridge | null = null;
  private refreshInFlight: Promise<string | null> | null = null;

  attachSession(bridge: SessionBridge) {
    this.bridge = bridge;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const authenticated = !options.anonymous;
    const tokenUsed = authenticated ? (this.bridge?.getAccessToken() ?? null) : null;

    let response = await this.send(path, options, tokenUsed);

    if (response.status === 401 && authenticated) {
      const freshToken = await this.reauthorize(tokenUsed);
      if (freshToken) response = await this.send(path, options, freshToken);
    }

    const body = await readBody(response);
    if (!response.ok) throw toApiError(response.status, body);

    return body as T;
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Single-flight refresh.
   *
   * The API rotates refresh tokens and treats a *replayed* token as theft: it revokes
   * the whole token family and forces a re-login (architecture §12.5). The feed
   * prefetches the next page while the current one is on screen, so it is completely
   * normal for several requests to 401 inside the same tick. If each of them refreshed
   * independently, the first would rotate the stored token and the rest would present
   * the now-consumed one — reuse detection would fire and we would sign the user out
   * for doing nothing wrong.
   *
   * So every 401 funnels through one promise and the rest queue behind it.
   */
  private reauthorize(tokenUsed: string | null): Promise<string | null> {
    // A refresh may already have completed while this request was in flight. Its token
    // is fresh, so retry with that instead of burning a second rotation.
    const current = this.bridge?.getAccessToken() ?? null;
    if (current && current !== tokenUsed) return Promise.resolve(current);

    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<string | null> {
    const bridge = this.bridge;
    if (!bridge) return null;

    const refreshToken = await bridge.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const tokens = await this.request<AuthTokens>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        anonymous: true,
      });

      await bridge.onTokensRotated(tokens);
      return tokens.accessToken;
    } catch (error) {
      // A refused refresh is terminal — the family is gone and no retry will help.
      // A transport failure is not: keep the stored token so the next attempt can use it.
      if (error instanceof ApiError) await bridge.onSessionExpired();
      return null;
    }
  }

  private async send(
    path: string,
    options: RequestOptions,
    accessToken: string | null,
  ): Promise<Response> {
    const { method = 'GET', body, query, timeoutMs = REQUEST_TIMEOUT_MS } = options;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    // Hand-rolled rather than `AbortSignal.timeout`, which React Native's AbortController
    // polyfill does not implement.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener('abort', abortFromCaller);

    try {
      return await fetch(buildUrl(path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (cause) {
      if (options.signal?.aborted) throw cause;
      throw new NetworkError(`Could not reach the Aura API (${method} ${path})`, { cause });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}

export const api = new ApiClient();
