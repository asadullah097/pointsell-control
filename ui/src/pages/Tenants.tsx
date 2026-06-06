import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981', trial: '#f59e0b', suspended: '#ef4444', expired: '#94a3b8',
};

export default function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    businessName: '', slug: '', businessType: 'retail', adminPassword: '', adminFullName: '',
    email: '', phone: '', plan: 'starter', notes: '',
    licenseMode: 'online', licenseExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    provisionPos: true,
  });

  function toSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  }

  useEffect(() => { loadTenants(); }, []);

  async function loadTenants() {
    setLoading(true);
    try { setTenants(await api.listTenants()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body: any = {
        businessName: form.businessName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        plan: form.plan,
        notes: form.notes || undefined,
        autoIssueLicense: {
          mode: form.licenseMode,
          expiresAt: form.licenseExpiresAt,
          features: { maxLocations: 1, restaurantMode: false, pharmacyMode: false, multiRegister: false },
        },
      };
      if (form.provisionPos) {
        body.slug = form.slug || toSlug(form.businessName);
        body.businessType = form.businessType;
        body.adminPassword = form.adminPassword;
        body.adminFullName = form.adminFullName || undefined;
      }
      const result: any = await api.createTenant(body);
      const lines = ['Business registered successfully!'];
      if (result.posProvision) {
        lines.push(`\nPOS Tenant: ${result.posProvision.tenant?.slug ?? form.slug}`);
        lines.push(`POS Admin: ${result.posProvision.user?.email ?? form.email}`);
        lines.push(`Seeded: ${result.posProvision.seed?.businessProfile?.businessType ?? form.businessType}`);
      }
      if (result.license) {
        lines.push(`\nLicense Key:\n${result.license.licenseKey}`);
        lines.push('\nShare this key with the client for activation.');
      }
      alert(lines.join('\n'));
      setShowForm(false);
      setForm({ businessName: '', slug: '', businessType: 'retail', adminPassword: '', adminFullName: '', email: '', phone: '', plan: 'starter', notes: '', licenseMode: 'online', licenseExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10), provisionPos: true });
      await loadTenants();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleStatus(t: any) {
    try {
      if (t.status === 'suspended') await api.activateTenant(t.id);
      else await api.suspendTenant(t.id);
      await loadTenants();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={styles.heading}>Businesses</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.primaryBtn}>
          {showForm ? 'Cancel' : '+ Register Business'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <form onSubmit={handleRegister} style={styles.card}>
          <h3 style={{ marginBottom: 4, color: '#1e293b' }}>Register New Business</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Creates the business record, issues a license, and optionally provisions the POS schema with seeders.
          </p>

          {/* ── Business info ── */}
          <div style={styles.sectionLabel}>Business Info</div>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Business Name *</label>
              <input style={styles.input} required value={form.businessName}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({ ...f, businessName: name, slug: f.slug || toSlug(name) }));
                }}
                placeholder="Al-Farooq Pharmacy" />
            </div>
            <div>
              <label style={styles.label}>Business Type *</label>
              <select style={styles.input} value={form.businessType}
                onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="hybrid">Hybrid (Retail + Wholesale)</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="restaurant">Restaurant / Cafe</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Owner Email *</label>
              <input style={styles.input} type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="owner@pharmacy.com" />
            </div>
            <div>
              <label style={styles.label}>Phone</label>
              <input style={styles.input} value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+92-300-1234567" />
            </div>
            <div>
              <label style={styles.label}>Plan</label>
              <select style={styles.input} value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Notes (internal)</label>
              <input style={styles.input} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Referred by Ahmed, 3-register setup" />
            </div>
          </div>

          {/* ── POS provisioning ── */}
          <div style={{ ...styles.sectionLabel, marginTop: 24 }}>
            POS Provisioning
            <label style={{ fontWeight: 400, marginLeft: 12, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.provisionPos}
                onChange={e => setForm(f => ({ ...f, provisionPos: e.target.checked }))}
                style={{ marginRight: 6 }} />
              Provision POS schema & run seeders
            </label>
          </div>
          {form.provisionPos && (
            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Subdomain Slug *</label>
                <input style={styles.input} required value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="alfarooq-pharmacy" />
                <span style={styles.hint}>Becomes the POS subdomain (slug.pointsell.app)</span>
              </div>
              <div>
                <label style={styles.label}>Admin Full Name</label>
                <input style={styles.input} value={form.adminFullName}
                  onChange={e => setForm(f => ({ ...f, adminFullName: e.target.value }))}
                  placeholder="Ahmed Ali" />
              </div>
              <div>
                <label style={styles.label}>Admin Password *</label>
                <input style={styles.input} type="password" required={form.provisionPos} minLength={8} value={form.adminPassword}
                  onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                  placeholder="Min 8 characters" />
                <span style={styles.hint}>This is the first admin login for this business's POS</span>
              </div>
            </div>
          )}

          {/* ── License ── */}
          <div style={{ ...styles.sectionLabel, marginTop: 24 }}>License</div>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>License Mode</label>
              <select style={styles.input} value={form.licenseMode}
                onChange={e => setForm(f => ({ ...f, licenseMode: e.target.value }))}>
                <option value="online">Online (phones home daily)</option>
                <option value="offline">Offline (air-gapped)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Expires At</label>
              <input style={styles.input} type="date" value={form.licenseExpiresAt}
                onChange={e => setForm(f => ({ ...f, licenseExpiresAt: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? 'Registering…' : form.provisionPos ? 'Register, Provision & Issue License' : 'Register & Issue License'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div style={{ color: '#64748b', marginTop: 24 }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>POS Slug</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Last Heartbeat</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600, cursor: 'pointer', color: '#3b82f6' }}
                  onClick={() => navigate(`/tenants/${t.id}`)}>
                  {t.businessName}
                </td>
                <td style={styles.td}>
                  {t.slug
                    ? <span style={styles.slugBadge}>{t.slug}</span>
                    : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                </td>
                <td style={styles.td}>{t.email ?? t.ownerEmail ?? '—'}</td>
                <td style={styles.td}>{t.plan}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }}>
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {t.lastHeartbeatAt ? new Date(t.lastHeartbeatAt).toLocaleDateString() : 'Never'}
                </td>
                <td style={styles.td}>
                  <button onClick={() => navigate(`/tenants/${t.id}`)} style={styles.actionBtn}>Manage</button>
                  <button onClick={() => toggleStatus(t)} style={{ ...styles.actionBtn, color: t.status === 'suspended' ? '#10b981' : '#ef4444' }}>
                    {t.status === 'suspended' ? 'Activate' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b' },
  primaryBtn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  card: { background: '#fff', padding: 28, borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 28 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  hint: { display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 3 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn: { padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, marginRight: 6 },
  slugBadge: { fontFamily: 'monospace', fontSize: 12, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 6, border: '1px solid #bfdbfe' },
};
