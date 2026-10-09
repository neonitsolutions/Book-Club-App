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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
