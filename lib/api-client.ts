/**
 * Brand-aware API client.
 * Automatically includes the active brand ID in all requests.
 */
export function getActiveBrandId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gramgenius-active-brand");
}

export async function apiCall(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const brandId = getActiveBrandId() || "";
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-brand-id": brandId,
      ...(options?.headers || {}),
    },
  });
}

export async function apiGet(url: string): Promise<Response> {
  return apiCall(url);
}

export async function apiPost(
  url: string,
  body: unknown
): Promise<Response> {
  return apiCall(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
