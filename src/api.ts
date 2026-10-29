import type { AppState, Kind, Stored, User } from "./data";
let csrf = "";
let sessionVersion = 0;
export function setCsrf(value: string) {
  csrf = value;
  ++sessionVersion;
}
export const currentSessionVersion = () => sessionVersion;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const startedSession = sessionVersion;
  const form = options.body instanceof FormData;
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(!form && options.body ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.startsWith("/auth/") &&
      startedSession === sessionVersion
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      [
        data.error || "Verbindung fehlgeschlagen.",
        ...(data.fields || [])
          .slice(0, 2)
          .map(
            (field: { field: string; message: string }) =>
              `${field.field}: ${field.message}`,
          ),
      ].join(" "),
      response.status,
    );
  }
  return data as T;
}
export const json = (value: unknown) => JSON.stringify(value);
export const getState = () => api<AppState>("/state");
export const saveRecord = <T extends Partial<Stored>>(kind: Kind, data: T) =>
  api<T>(`/records/${kind}${data.id ? "/" + data.id : ""}`, {
    method: data.id ? "PUT" : "POST",
    body: json(data),
  });
export const deleteRecord = (kind: Kind, record: Stored) =>
  api(`/records/${kind}/${record.id}`, {
    method: "DELETE",
    body: json({ version: record.version }),
  });
export type Auth = { user: User; csrf: string };
