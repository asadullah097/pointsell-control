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
  // Keyed by POS tenant slug, not this tenant's own id — see tenants.controller.ts.
  listPlanRequests: (slug: string) => request<any[]>('GET', `/tenants/${slug}/plan-requests`),
  resolvePlanRequest: (slug: string, requestId: string, body: { status: 'approved' | 'rejected'; adminResponse?: string }) =>
    request<any>('PATCH', `/tenants/${slug}/plan-requests/${requestId}`, body),

  // Licenses
  createLicense: (body: any) => request<any>('POST', '/licenses', body),
  revokeLicense: (id: string) => request<void>('DELETE', `/licenses/${id}`),
  generateOfflineFile: (id: string, fingerprint: string, businessName: string) =>
    request<any>('POST', `/licenses/${id}/offline-file`, { fingerprint, businessName }),
  renewLicense: (id: string, durationDays?: number, amount?: number, note?: string) =>
    request<any>('PATCH', `/licenses/${id}/renew`, { durationDays, amount, note }),
  changeLicensePlan: (id: string, planId: string, extend?: boolean, amount?: number, note?: string) =>
    request<any>('PATCH', `/licenses/${id}/change-plan`, { planId, extend, amount, note }),

  // Transactions
  listTransactions: (params?: { tenantId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]).toString();
    return request<any[]>('GET', `/transactions${qs ? `?${qs}` : ''}`);
  },
  getTransactionSummary: () => request<any>('GET', '/transactions/summary'),
  recordTransaction: (body: { tenantId: string; planId?: string; amount: number; billingCycle: 'monthly' | 'yearly'; note?: string }) =>
    request<any>('POST', '/transactions', body),

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

  // Signup requests (public landing page submissions awaiting review)
  listSignupRequests: (status?: string) => request<any[]>('GET', `/signup-requests${status && status !== 'all' ? `?status=${status}` : ''}`),
  getSignupRequest: (id: string) => request<any>('GET', `/signup-requests/${id}`),
  approveSignupRequest: (id: string, body: {
    planId?: string; trialDays?: number; slug?: string; businessTypeOverride?: string; provisionPos?: boolean;
  }) => request<any>('POST', `/signup-requests/${id}/approve`, body),
  rejectSignupRequest: (id: string, reason?: string) =>
    request<any>('POST', `/signup-requests/${id}/reject`, { reason }),

  // Support tickets
  listTickets: () => request<any[]>('GET', '/tickets'),
  getTicket: (tenantId: string, ticketId: string) => request<any>('GET', `/tickets/${tenantId}/${ticketId}`),
  replyTicket: (tenantId: string, ticketId: string, message: string) =>
    request<any>('POST', `/tickets/${tenantId}/${ticketId}/reply`, { message }),
  updateTicketStatus: (tenantId: string, ticketId: string, status: 'in_progress' | 'resolved' | 'closed') =>
    request<any>('PATCH', `/tickets/${tenantId}/${ticketId}/status`, { status }),
  // Auth here is a bearer token in localStorage, not a cookie — a plain <a href>
  // won't send it, so this fetches with the header and hands back an
  // object URL the caller can open/download instead.
  fetchTicketAttachment: async (slug: string, ticketId: string, attachmentId: string): Promise<string> => {
    const res = await fetch(`${BASE}/tickets/${slug}/${ticketId}/attachments/${attachmentId}`, {
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    });
    if (!res.ok) throw new Error(`Failed to fetch attachment (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
