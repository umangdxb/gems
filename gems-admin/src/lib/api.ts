const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * The backend sometimes persists absolute URLs with the origin it was running on
 * at upload time (e.g. http://localhost:3000/uploads/...). When deployed, those
 * URLs need their origin replaced with the configured API base URL.
 */
export function resolveAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    const base = new URL(BASE_URL || window.location.origin)
    if (parsed.origin !== base.origin) {
      parsed.protocol = base.protocol
      parsed.hostname = base.hostname
      parsed.port = base.port
    }
    return parsed.toString()
  } catch {
    return url
  }
}

async function request<T>(path: string, init?: RequestInit, explicitToken?: string): Promise<T> {
  const token = explicitToken ?? localStorage.getItem('gems_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

async function uploadForm<T>(path: string, formData: FormData, explicitToken?: string): Promise<T> {
  const token = explicitToken ?? localStorage.getItem('gems_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    // Do NOT set Content-Type — browser sets it automatically with the correct boundary
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Upload failed')
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  uploadForm,
}
