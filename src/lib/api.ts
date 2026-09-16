/// Appels API côté navigateur. Une seule fonction : elle envoie du JSON,
/// lit du JSON, et transforme une réponse d'erreur en exception portant
/// le message destiné à l'utilisateur.
export class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? "Une erreur est survenue. Réessayez.";
    throw new ApiClientError(res.status, msg);
  }
  return data as T;
}

export async function uploadFile(file: File, kind: string): Promise<{ url: string; fileId: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return api("/api/upload", { method: "POST", body: form });
}
