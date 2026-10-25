const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export interface CompanyMeta { id: string; name: string; timezone: string; }
export interface SessionUser { id: string; email: string; role: 'ADMIN' | 'HR' | 'EMPLOYEE'; employeeId: string | null; mustChangePassword: boolean; company?: CompanyMeta | null; }

export function getToken(): string | null { return sessionStorage.getItem('hcm_token'); }
export function setToken(token: string | null): void { if (token) sessionStorage.setItem('hcm_token', token); else sessionStorage.removeItem('hcm_token'); }

async function request<T>(path: string): Promise<T> {
  return rawRequest<T>(path);
}

async function rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (response.status === 204) return undefined as T;
  const body = await response.json() as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? 'The request could not be completed.');
  return body.data as T;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/api/health'),
  readiness: () => request<{ status: string; database: string }>('/api/ready'),
  setupStatus: () => request<{ needsSetup: boolean; company?: CompanyMeta | null }>('/api/v1/setup/status'),
  setup: (body: unknown) => rawRequest<{ token: string; user: SessionUser }>('/api/v1/setup/first-run', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: unknown) => rawRequest<{ token: string; user: SessionUser }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: SessionUser }>('/api/v1/auth/me'),
  changePassword: (body: unknown) => rawRequest<void>('/api/v1/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(`/api/v1${path}`),
  post: <T>(path: string, body?: unknown) => rawRequest<T>(`/api/v1${path}`, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => rawRequest<T>(`/api/v1${path}`, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => rawRequest<T>(`/api/v1${path}`, { method: 'PATCH', body: JSON.stringify(body) }),
  downloadPayslip: async (id: string, filename = 'payslip.pdf'): Promise<void> => {
    const token = getToken();
    const response = await fetch(`${apiBaseUrl}/api/v1/payslips/${id}/pdf`, {
      headers: token ? { authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Failed to download payslip.' } })) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? 'Failed to download payslip.');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};

