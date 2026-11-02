/**
 * Call the backend through the same-origin /api path.
 *
 * In the browser a relative URL is enough: the load balancer (AWS) or the
 * dev-server rewrite (local) forwards /api/* to the backend, so one image
 * works in every environment.
 *
 * Server Components have no page origin, so on the server we prefix
 * INTERNAL_API_URL, read at runtime (e.g. http://backend:3001 in
 * docker-compose, the backend's internal address in AWS).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

function apiUrl(path: string): string {
  const cleanPath = `/api${path.startsWith("/") ? path : `/${path}`}`;
  if (typeof window !== "undefined") return cleanPath;
  const base = process.env.INTERNAL_API_URL ?? "http://localhost:3001";
  return `${base}${cleanPath}`;
}

// Endpoints that must not trigger a token refresh when they return 401
const NO_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/verify-email",
  "/auth/resend-verification",
];

// One refresh at a time: parallel 401s share it instead of each rotating the token
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(apiUrl("/auth/refresh"), { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function send(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init);

  // The access token lasts 15 minutes; get a new one and try once more.
  // Retry even if this refresh failed: another tab may have just refreshed.
  if (res.status === 401 && typeof window !== "undefined" && !NO_REFRESH.includes(path)) {
    await refreshSession();
    res = await send(path, init);
  }

  if (res.status === 204) return undefined as T;
  const body = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
