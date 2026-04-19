import type { ApiError } from "shared";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    super(body.error);
    this.name = "ApiRequestError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  const body = await res.json();

  if (!res.ok) {
    throw new ApiRequestError(res.status, body as ApiError);
  }

  return body as T;
}
