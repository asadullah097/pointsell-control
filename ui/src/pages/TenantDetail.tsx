import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981', trial: '#f59e0b', suspended: '#ef4444',
  expired: '#94a3b8', revoked: '#ef4444',
};

/** `plan` is either a Plan object (this repo's own tenants, local mode), a plain
 * string (proxied from nestjs-pos's own Tenant.plan enum, cloud mode), or absent. */
function planLabel(t: any): string {
  if (t.plan && typeof t.plan === 'object') return t.plan.name;
  if (typeof t.plan === 'string') return t.plan;
  if (t.legacyPlan) return t.legacyPlan;
  return '—';
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [planRequests, setPlanRequests] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showLicForm, setShowLicForm] = useState(false);
  const [showOffline, setShowOffline] = useState<string | null>(null);
  const [offlineResult, setOfflineResult] = useState<string>('');
  const [licForm, setLicForm] = useState({ mode: 'online', expiresAt: '', planId: '', features: '{}' });
  const [offlineForm, setOfflineForm] = useState({ fingerprint: '', businessName: '' });
  const [changePlanFor, setChangePlanFor] = useState<string | null>(null);
  const [changePlanId, setChangePlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState('');
  const [reseeding, setReseeding] = useState(false);
  const [reseedMsg, setReseedMsg] = useState('');
  const [reseedType, setReseedType] = useState('');

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    try {
      const [t, l, p, pr] = await Promise.all([
        api.listTenants().then(arr => arr.find((x: any) => x.id === id)),
        api.getTenantLicenses(id!),
        api.listPlans(),
        api.listPlanRequests(id!).catch(() => []),
      ]);
      setTenant(t);
      setLicenses(l);
      setPlans(p.filter((pl: any) => pl.isActive));
      setPlanRequests(pr.filter((r: any) => r.status === 'pending'));
    } catch (e: any) { setError(e.message); }
  }

  /**
   * Approving used to be a two-step, easy-to-forget manual process: apply the
   * matching Renew/Change Plan action on the license below, THEN separately
   * resolve the request — enforced only by an alert() reminder. When there's
   * exactly one active license (the normal case), this now applies the
   * matching action automatically as part of approval, so the two steps can't
   * drift apart. Falls back to the old manual reminder when it's ambiguous
   * (zero or multiple active licenses) or for cancellation requests, which
   * have no single corresponding license action.
   */
  async function handleResolvePlanRequest(requestId: string, status: 'approved' | 'rejected', request?: any) {
    const adminResponse = prompt(status === 'approved'
      ? 'Optional note (e.g. "Renewed via license below on 2026-07-05")'
      : 'Optional reason for rejecting') ?? undefined;

    const activeLicenses = licenses.filter(l => l.status === 'active');
    const license = activeLicenses.length === 1 ? activeLicenses[0] : null;

    try {
      if (status === 'approved' && request?.type === 'renewal' && license) {
        await api.renewLicense(license.id);
      } else if (status === 'approved' && request?.type === 'upgrade' && license && request.requestedPlanKey) {
        const plan = plans.find(p => p.key === request.requestedPlanKey);
        if (plan) await api.changeLicensePlan(license.id, plan.id, false);
        else alert(`Marking approved, but plan key "${request.requestedPlanKey}" wasn't found among active plans — change it manually on the license below.`);
      } else if (status === 'approved') {
        alert('Marking approved. Remember: this does NOT itself renew/change the plan — use Renew/Change Plan on the license below first.');
      }
      await api.resolvePlanRequest(id!, requestId, { status, adminResponse: adminResponse || undefined });
      await loadAll();
    } catch (e: any) { setError(e.message); }
  }

  async function handleRenew(licId: string) {
    const days = prompt('Extend by how many days? (leave blank to use the license\'s plan default, or 30)');
    if (days === null) return;
    try {
      await api.renewLicense(licId, days.trim() ? Number(days) : undefined);
      await loadAll();
    } catch (e: any) { setError(e.message); }
  }

  async function handleChangePlan(licId: string) {
    if (!changePlanId) return;
    try {
      await api.changeLicensePlan(licId, changePlanId, confirm('Also extend expiry by the new plan\'s duration?'));
      setChangePlanFor(null);
      await loadAll();
    } catch (e: any) { setError(e.message); }
  }

  async function handleIssueLicense(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createLicense({
        tenantId: id,
        mode: licForm.mode,
        expiresAt: licForm.expiresAt,
        planId: licForm.planId || undefined,
        features: licForm.features.trim() ? JSON.parse(licForm.features) : undefined,
      });
      setShowLicForm(false);
      await loadAll();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleRevoke(licId: string) {
    if (!confirm('Revoke this license? The POS will stop working at next recheck.')) return;
    try { await api.revokeLicense(licId); await loadAll(); }
    catch (e: any) { setError(e.message); }
  }

  async function handleRunMigrations() {
    if (!confirm(`Run migrations for "${tenant.businessName}"?\n\nThis provisions the schema and runs any pending migrations. Safe to run multiple times.`)) return;
    setProvisioning(true);
    setProvisionMsg('');
    try {
      await api.reprovisionTenant(id!);
      await loadAll();
      setProvisionMsg('Migrations completed successfully.');
    } catch (e: any) {
      setProvisionMsg(`Error: ${e.message}`);
    } finally {
      setProvisioning(false);
    }
  }

  async function handleReseed() {
    const type = reseedType || tenant.businessType;
    if (!type) { setReseedMsg('Error: set a business type first.'); return; }
    if (!confirm(`Re-seed "${tenant.businessName}" as business type "${type}"?\n\nThis re-runs categories, feature flags, and menu/product seeds. Safe to run multiple times.`)) return;
    setReseeding(true);
    setReseedMsg('');
    try {
      const res = await api.reseedTenant(tenant.posId ?? tenant.id, type);
      setReseedMsg(`Seeder ran successfully (type: ${res?.seeded ?? type}).`);
    } catch (e: any) {
      setReseedMsg(`Error: ${e.message}`);
    } finally {
      setReseeding(false);
    }
  }

  async function handleOfflineGenerate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.generateOfflineFile(showOffline!, offlineForm.fingerprint, offlineForm.businessName || tenant?.businessName);
      setOfflineResult(JSON.stringify(result.licenseFile, null, 2));
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (!tenant) return <div style={{ color: '#64748b' }}>Loading…</div>;

  return (
    <div>
      <button onClick={() => navigate('/tenants')} style={styles.backBtn}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={styles.heading}>{tenant.businessName}</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            {[tenant.email, tenant.phone].filter(Boolean).join(' · ')}
            {tenant.posSlug && (
              <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 12, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                {tenant.posSlug}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...styles.badge, background: STATUS_COLOR[tenant.status] + '22', color: STATUS_COLOR[tenant.status] }}>
            {tenant.status}
          </span>
          <button
            onClick={handleRunMigrations}
            disabled={provisioning}
            style={{ ...styles.primaryBtn, background: provisioning ? '#94a3b8' : '#0f172a', fontSize: 13, padding: '7px 14px' }}
            title="Provision schema and run pending migrations"
          >
            {provisioning ? 'Running…' : '⚙ Run Migrations'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {provisionMsg && (
        <div style={{ ...styles.error, background: provisionMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', borderColor: provisionMsg.startsWith('Error') ? '#fecaca' : '#86efac', color: provisionMsg.startsWith('Error') ? '#dc2626' : '#166534', marginBottom: 16 }}>
          {provisionMsg}
        </div>
      )}

      {/* Tenant info cards */}
      <div style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Plan</div>
          <div style={styles.infoVal}>{planLabel(tenant)}</div>
          {tenant.plan && typeof tenant.plan === 'object' && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {tenant.plan.maxUsers === null ? '∞' : tenant.plan.maxUsers} users · {tenant.plan.maxLocations === null ? '∞' : tenant.plan.maxLocations} locations
            </div>
          )}
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Expires</div>
          {(() => {
            const d = daysUntil(tenant.subscriptionEndsAt);
            if (d === null) return <div style={{ ...styles.infoVal, color: '#94a3b8' }}>—</div>;
            const color = d < 0 ? '#ef4444' : d <= 7 ? '#f59e0b' : '#1e293b';
            return (
              <>
                <div style={{ ...styles.infoVal, color }}>{new Date(tenant.subscriptionEndsAt).toLocaleDateString()}</div>
                <div style={{ fontSize: 12, color, marginTop: 2 }}>
                  {d < 0 ? `Expired ${Math.abs(d)}d ago` : d === 0 ? 'Expires today' : `${d}d remaining`}
                </div>
              </>
            );
          })()}
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Business Type</div>
          <div style={styles.infoVal}>
            {tenant.businessType
              ? <span style={{ textTransform: 'capitalize' }}>{tenant.businessType}</span>
              : <span style={{ color: '#94a3b8' }}>—</span>}
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>POS Slug</div>
          <div style={styles.infoVal}>
            {tenant.posSlug
              ? <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{tenant.posSlug}</span>
              : <span style={{ color: '#94a3b8' }}>Not provisioned</span>}
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Last Version</div>
          <div style={styles.infoVal}>{tenant.lastSeenVersion ?? '—'}</div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Last Heartbeat</div>
          <div style={styles.infoVal}>{tenant.lastHeartbeatAt ? new Date(tenant.lastHeartbeatAt).toLocaleString() : 'Never'}</div>
        </div>
      </div>

      {/* Re-seed section */}
      <div style={{ ...styles.card, margin: '24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Re-run Seeders</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Re-seeds categories, feature flags, and menu/product items. Safe to run multiple times.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={reseedType || tenant.businessType || ''}
              onChange={e => setReseedType(e.target.value)}
              style={{ ...styles.input, width: 'auto', height: 36, padding: '0 10px', fontSize: 13 }}
            >
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="restaurant">Restaurant / Cafe</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="hybrid">Hybrid</option>
              <option value="service">Service</option>
            </select>
            <button
              onClick={handleReseed}
              disabled={reseeding}
              style={{ ...styles.primaryBtn, background: reseeding ? '#94a3b8' : '#7c3aed', fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap' }}
            >
              {reseeding ? 'Seeding…' : '🌱 Re-seed'}
            </button>
          </div>
        </div>
        {reseedMsg && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13, background: reseedMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: reseedMsg.startsWith('Error') ? '#dc2626' : '#166534', border: `1px solid ${reseedMsg.startsWith('Error') ? '#fecaca' : '#86efac'}` }}>
            {reseedMsg}
          </div>
        )}
      </div>

      {/* Pending plan requests — raised by the tenant from the POS itself */}
      {planRequests.length > 0 && (
        <div style={{ ...styles.card, margin: '24px 0', border: '1px solid #fde68a', background: '#fffbeb' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', margin: '0 0 12px' }}>
            Pending Plan Requests ({planRequests.length})
          </p>
          {planRequests.map(r => {
            const activeLicenses = licenses.filter(l => l.status === 'active');
            const license = activeLicenses.length === 1 ? activeLicenses[0] : null;
            let autoApplyHint: string | null = null;
            if (r.type === 'renewal') {
              autoApplyHint = license
                ? 'Approving will also renew the active license below.'
                : 'No single active license to auto-renew — apply manually after approving.';
            } else if (r.type === 'upgrade') {
              const plan = plans.find(p => p.key === r.requestedPlanKey);
              autoApplyHint = license && plan
                ? `Approving will also switch the active license to "${plan.name}".`
                : 'No single matching active license/plan to auto-apply — apply manually after approving.';
            }
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #fde68a' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                    {r.type}{r.requestedPlanKey ? ` → ${r.requestedPlanKey}` : ''}
                  </p>
                  {r.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>"{r.note}"</p>}
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleString()}</p>
                  {autoApplyHint && <p style={{ margin: '4px 0 0', fontSize: 11, color: license ? '#059669' : '#b45309' }}>{autoApplyHint}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleResolvePlanRequest(r.id, 'approved', r)} style={{ ...styles.actionBtn, background: '#10b981', color: '#fff', border: 'none' }}>
                    Approve
                  </button>
                  <button onClick={() => handleResolvePlanRequest(r.id, 'rejected', r)} style={{ ...styles.actionBtn, color: '#ef4444' }}>
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Licenses section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 16px' }}>
        <h3 style={styles.sectionHeading}>Licenses</h3>
        <button onClick={() => setShowLicForm(!showLicForm)} style={styles.primaryBtn}>
          {showLicForm ? 'Cancel' : '+ Issue License'}
        </button>
      </div>

      {showLicForm && (
        <form onSubmit={handleIssueLicense} style={{ ...styles.card, marginBottom: 24 }}>
          <h4 style={{ marginBottom: 16 }}>New License for {tenant.businessName}</h4>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Mode</label>
              <select style={styles.input} value={licForm.mode} onChange={e => setLicForm(f => ({ ...f, mode: e.target.value }))}>
                <option value="online">Online (phones home daily)</option>
                <option value="offline">Offline (air-gapped, no heartbeat)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Expires At *</label>
              <input style={styles.input} type="date" required value={licForm.expiresAt}
                onChange={e => setLicForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>Plan</label>
              <select style={styles.input} value={licForm.planId}
                onChange={e => setLicForm(f => ({ ...f, planId: e.target.value }))}>
                <option value="">None (use Features JSON below)</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span style={styles.hint}>Drives maxUsers/maxLocations automatically</span>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Features (JSON) — only needed for manual overrides or a plan-less license</label>
            <input style={styles.input} value={licForm.features}
              onChange={e => setLicForm(f => ({ ...f, features: e.target.value }))}
              placeholder='{"restaurantMode":false,"pharmacyMode":false,"multiRegister":false}' />
          </div>
          <button type="submit" disabled={saving} style={{ ...styles.primaryBtn, marginTop: 16 }}>
            {saving ? 'Issuing…' : 'Issue License'}
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={styles.th}>License Key</th>
            <th style={styles.th}>Mode</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Expires</th>
            <th style={styles.th}>Activated</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map(l => (
            <tr key={l.id} style={styles.tr}>
              <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 13 }}>{l.licenseKey}</td>
              <td style={styles.td}>{l.mode}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: STATUS_COLOR[l.status] + '22', color: STATUS_COLOR[l.status] }}>{l.status}</span>
              </td>
              <td style={styles.td}>{new Date(l.expiresAt).toLocaleDateString()}</td>
              <td style={styles.td}>{l.activatedAt ? new Date(l.activatedAt).toLocaleDateString() : 'Not yet'}</td>
              <td style={styles.td}>
                {l.status !== 'revoked' && (
                  <button onClick={() => handleRenew(l.id)} style={{ ...styles.actionBtn, color: '#10b981' }}>Renew</button>
                )}
                {l.status !== 'revoked' && (
                  <button onClick={() => { setChangePlanFor(changePlanFor === l.id ? null : l.id); setChangePlanId(l.planId ?? ''); }} style={styles.actionBtn}>
                    Change Plan
                  </button>
                )}
                {l.mode === 'offline' && l.status === 'active' && (
                  <button onClick={() => { setShowOffline(l.id); setOfflineResult(''); }} style={styles.actionBtn}>
                    Offline File
                  </button>
                )}
                {l.status === 'active' && (
                  <button onClick={() => handleRevoke(l.id)} style={{ ...styles.actionBtn, color: '#ef4444' }}>Revoke</button>
                )}
                {changePlanFor === l.id && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select style={{ ...styles.input, width: 'auto', padding: '6px 8px', fontSize: 13 }} value={changePlanId}
                      onChange={e => setChangePlanId(e.target.value)}>
                      <option value="">Select plan…</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={() => handleChangePlan(l.id)} disabled={!changePlanId} style={{ ...styles.actionBtn, background: '#3b82f6', color: '#fff' }}>
                      Apply
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {licenses.length === 0 && (
            <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No licenses yet</td></tr>
          )}
        </tbody>
      </table>

      {/* Offline license file generator */}
      {showOffline && (
        <div style={{ ...styles.card, marginTop: 24 }}>
          <h4 style={{ marginBottom: 16 }}>Generate Offline License File</h4>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Ask the client to run <code>GET /v1/license/fingerprint</code> on their machine and send you the fingerprint.
          </p>
          <form onSubmit={handleOfflineGenerate}>
            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Machine Fingerprint *</label>
                <input style={styles.input} required value={offlineForm.fingerprint}
                  onChange={e => setOfflineForm(f => ({ ...f, fingerprint: e.target.value }))}
                  placeholder="SHA-256 hash from client machine" />
              </div>
              <div>
                <label style={styles.label}>Business Name</label>
                <input style={styles.input} value={offlineForm.businessName}
                  onChange={e => setOfflineForm(f => ({ ...f, businessName: e.target.value }))}
                  placeholder={tenant.businessName} />
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ ...styles.primaryBtn, marginTop: 16 }}>
              {saving ? 'Generating…' : 'Generate license.key'}
            </button>
          </form>
          {offlineResult && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Save this as <code>license.key</code> and deliver to client:</p>
              <textarea style={{ width: '100%', height: 200, fontFamily: 'monospace', fontSize: 12, padding: 12, border: '1px solid #d1d5db', borderRadius: 8 }}
                readOnly value={offlineResult} />
              <button onClick={() => { navigator.clipboard.writeText(offlineResult); }} style={{ ...styles.actionBtn, marginTop: 8 }}>
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b' },
  backBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0 },
  primaryBtn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 },
  infoCard: { background: '#fff', padding: '16px 20px', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  infoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoVal: { fontSize: 16, fontWeight: 600, color: '#1e293b', marginTop: 4 },
  sectionHeading: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  card: { background: '#fff', padding: 28, borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn: { padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, marginRight: 6 },
};
