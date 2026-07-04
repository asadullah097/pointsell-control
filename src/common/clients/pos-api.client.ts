import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PosTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  ownerEmail: string;
  schemaName: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PosTenantMetrics {
  tenantId: string;
  slug: string;
  schemaName: string;
  orderCount: number;
  userCount: number;
  productCount: number;
  schemaSizeBytes: number;
  lastOrderAt: string | null;
  collectedAt: string;
}

/**
 * PosApiClient — HTTP client for the nestjs-pos admin API.
 *
 * Used only when CLOUD_POS_API_URL is configured (cloud / SaaS mode).
 * Falls back to a no-op / null pattern when not configured (local-only installs).
 *
 * Required env vars in pointsell-control:
 *   CLOUD_POS_API_URL=https://api.pointsell.app
 *   CONTROL_PANEL_API_KEY=<same 32-char key set in the POS backend>
 */
@Injectable()
export class PosApiClient {
  private readonly logger = new Logger(PosApiClient.name);
  private readonly baseUrl: string | null;
  private readonly apiKey: string | null;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('CLOUD_POS_API_URL') ?? null;
    this.apiKey = config.get<string>('CONTROL_PANEL_API_KEY') ?? null;
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  // ── Tenant list + detail ──────────────────────────────────────────────────

  listTenants(): Promise<PosTenant[]> {
    return this.get<PosTenant[]>('admin/tenants');
  }

  getTenant(id: string): Promise<PosTenant> {
    return this.get<PosTenant>(`admin/tenants/${id}`);
  }

  updateTenant(id: string, body: Partial<Pick<PosTenant, 'plan' | 'status' | 'name'>>): Promise<PosTenant> {
    return this.patch<PosTenant>(`admin/tenants/${id}`, body);
  }

  /**
   * Pushes plan entitlements to nestjs-pos after a license renew/change-plan.
   * Keyed by slug (not id) — pointsell-control only ever learns a cloud tenant's
   * posSlug at provisioning time, never its nestjs-pos-side row id.
   * Best-effort by design: callers should swallow failures rather than fail the
   * renew/change-plan response, same as the license heartbeat pattern.
   */
  updateEntitlements(
    slug: string,
    body: { maxUsers: number | null; maxLocations: number | null; expiresAt: string; planKey?: string },
  ): Promise<PosTenant> {
    return this.patch<PosTenant>(`admin/tenants/by-slug/${slug}/entitlements`, body);
  }

  // ── Lifecycle actions ─────────────────────────────────────────────────────

  suspendTenant(id: string): Promise<PosTenant> {
    return this.post<PosTenant>(`admin/tenants/${id}/suspend`);
  }

  activateTenant(id: string): Promise<PosTenant> {
    return this.post<PosTenant>(`admin/tenants/${id}/activate`);
  }

  reprovisionTenant(id: string): Promise<PosTenant> {
    return this.post<PosTenant>(`admin/tenants/${id}/provision`);
  }

  reseedTenant(id: string, businessType?: string): Promise<{ seeded: string }> {
    return this.post<{ seeded: string }>(`admin/tenants/${id}/reseed`, businessType ? { businessType } : {});
  }

  deleteTenant(id: string): Promise<void> {
    return this.delete(`admin/tenants/${id}`);
  }

  // ── Tenant provisioning (calls POST /api/auth/register-tenant on POS) ─────

  async provisionTenant(body: {
    businessName: string;
    slug: string;
    businessType: string;
    email: string;
    password: string;
    fullName?: string;
    plan?: string;
  }): Promise<{ tenant: any; user: any; seed: any }> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        'CLOUD_POS_API_URL / CONTROL_PANEL_API_KEY not configured — cannot provision POS tenant',
      );
    }

    const url = `${this.baseUrl}/v1/auth/register-tenant`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Control-Panel-Key': this.apiKey!,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`POS provision ${url} → ${res.status}: ${JSON.stringify(data)}`);
      throw new InternalServerErrorException(
        (data as any)?.message ?? `POS provision error ${res.status}`,
      );
    }
    return (data as any)?.data ?? data;
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  getTenantMetrics(id: string): Promise<PosTenantMetrics> {
    return this.get<PosTenantMetrics>(`admin/tenants/${id}/metrics`);
  }

  getAllMetrics(): Promise<PosTenantMetrics[]> {
    return this.get<PosTenantMetrics[]>('admin/tenants/metrics/all');
  }

  // ── Plan requests (keyed by slug — see updateEntitlements' comment) ───────

  listPlanRequests(slug: string): Promise<any[]> {
    return this.get<any[]>(`admin/tenants/by-slug/${slug}/plan-requests`);
  }

  resolvePlanRequest(
    slug: string,
    requestId: string,
    body: { status: 'approved' | 'rejected'; adminResponse?: string },
  ): Promise<any> {
    return this.patch<any>(`admin/tenants/by-slug/${slug}/plan-requests/${requestId}`, body);
  }

  // ── Private HTTP helpers ──────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private async delete(path: string): Promise<void> {
    await this.request<void>('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        'CLOUD_POS_API_URL / CONTROL_PANEL_API_KEY not configured',
      );
    }

    const url = `${this.baseUrl}/v1/${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Control-Panel-Key': this.apiKey!,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return undefined as T;

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      this.logger.error(`POS API ${method} ${url} → ${res.status}: ${JSON.stringify(data)}`);
      throw new InternalServerErrorException(
        (data as any)?.message ?? `POS API error ${res.status}`,
      );
    }

    // nestjs-pos wraps responses in { success, data } envelope
    return (data as any)?.data ?? data;
  }
}
