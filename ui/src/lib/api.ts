const BASE = '/api';

function getToken() {
  return localStorage.getItem('token') ?? '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string }>('POST', '/auth/login', { email, password }),

  // Dashboard
  stats: () => request<any>('GET', '/dashboard/stats'),

  // Tenants
  listTenants: () => request<any[]>('GET', '/tenants'),
  createTenant: (body: any) => request<any>('POST', '/tenants', body),
  updateTenant: (id: string, body: any) => request<any>('PATCH', `/tenants/${id}`, body),
  suspendTenant: (id: string) => request<any>('POST', `/tenants/${id}/suspend`),
  activateTenant: (id: string) => request<any>('POST', `/tenants/${id}/activate`),
  reprovisionTenant: (id: string) => request<any>('POST', `/tenants/${id}/provision`),
  reseedTenant: (id: string, businessType?: string) => request<any>('POST', `/tenants/${id}/reseed`, businessType ? { businessType } : {}),
  deleteTenant: (id: string) => request<void>('DELETE', `/tenants/${id}`),
  getTenantLicenses: (tenantId: string) => request<any[]>('GET', `/licenses/tenant/${tenantId}`),
  getMetrics: (id: string) => request<any>('GET', `/tenants/${id}/metrics`),
  listPlanRequests: (id: string) => request<any[]>('GET', `/tenants/${id}/plan-requests`),
  resolvePlanRequest: (id: string, requestId: string, body: { status: 'approved' | 'rejected'; adminResponse?: string }) =>
    request<any>('PATCH', `/tenants/${id}/plan-requests/${requestId}`, body),

  // Licenses
  createLicense: (body: any) => request<any>('POST', '/licenses', body),
  revokeLicense: (id: string) => request<void>('DELETE', `/licenses/${id}`),
  generateOfflineFile: (id: string, fingerprint: string, businessName: string) =>
    request<any>('POST', `/licenses/${id}/offline-file`, { fingerprint, businessName }),
  renewLicense: (id: string, durationDays?: number) =>
    request<any>('PATCH', `/licenses/${id}/renew`, durationDays ? { durationDays } : {}),
  changeLicensePlan: (id: string, planId: string, extend?: boolean) =>
    request<any>('PATCH', `/licenses/${id}/change-plan`, { planId, extend }),

  // Plans
  listPlans: () => request<any[]>('GET', '/plans'),
  createPlan: (body: any) => request<any>('POST', '/plans', body),
  updatePlan: (id: string, body: any) => request<any>('PATCH', `/plans/${id}`, body),
  deletePlan: (id: string) => request<{ softHidden: boolean }>('DELETE', `/plans/${id}`),

  // Releases
  listReleases: () => request<any[]>('GET', '/releases'),
  createRelease: (body: any) => request<any>('POST', '/releases', body),
  publishRelease: (id: string) => request<any>('POST', `/releases/${id}/publish`),
  unpublishRelease: (id: string) => request<any>('POST', `/releases/${id}/unpublish`),
  deleteRelease: (id: string) => request<void>('DELETE', `/releases/${id}`),

  // Admins
  listAdmins: () => request<any[]>('GET', '/auth/admins'),
  createAdmin: (body: any) => request<any>('POST', '/auth/admins', body),
  deleteAdmin: (id: string) => request<void>('DELETE', `/auth/admins/${id}`),
};
