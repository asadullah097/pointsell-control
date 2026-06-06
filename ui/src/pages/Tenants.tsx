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
  const [form, setForm] = useState({ businessName: '', email: '', phone: '', plan: 'starter', notes: '', licenseMode: 'online', licenseExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10) });

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
      const result: any = await api.createTenant({
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
      });
      if (result.license) {
        alert(`Business registered!\n\nLicense Key: ${result.license.licenseKey}\n\nShare this key with the client for activation.`);
      }
      setShowForm(false);
      setForm({ businessName: '', email: '', phone: '', plan: 'starter', notes: '', licenseMode: 'online', licenseExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10) });
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
          <h3 style={{ marginBottom: 16, color: '#1e293b' }}>Register New Business</h3>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Business Name *</label>
              <input style={styles.input} required value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="Al-Farooq Pharmacy" />
            </div>
            <div>
              <label style={styles.label}>Owner Email</label>
              <input style={styles.input} type="email" value={form.email}
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
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Notes (internal)</label>
            <input style={styles.input} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Referred by Ahmed, 3-register setup" />
          </div>
          <div style={{ ...styles.formGrid, marginTop: 16 }}>
            <div>
              <label style={styles.label}>License Mode</label>
              <select style={styles.input} value={form.licenseMode} onChange={e => setForm(f => ({ ...f, licenseMode: e.target.value }))}>
                <option value="online">Online (phones home daily)</option>
                <option value="offline">Offline (air-gapped)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>License Expires At</label>
              <input style={styles.input} type="date" value={form.licenseExpiresAt}
                onChange={e => setForm(f => ({ ...f, licenseExpiresAt: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? 'Registering…' : 'Register & Issue License'}
            </button>
          </div>
        </form>
      )}

      {loading ? <div style={{ color: '#64748b', marginTop: 24 }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Business</th>
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
                <td style={styles.td}>{t.email ?? '—'}</td>
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
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  card: { background: '#fff', padding: 28, borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 28 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn: { padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, marginRight: 6 },
};
