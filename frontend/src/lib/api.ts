export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init?.headers);
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.trim();
    if (message) {
      try {
        const j = JSON.parse(message) as { error?: string; detail?: string };
        if (typeof j.error === "string") message = j.error;
        else if (typeof j.detail === "string") message = j.detail;
      } catch {
        /* keep text */
      }
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
