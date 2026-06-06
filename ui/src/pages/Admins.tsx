import { useEffect, useState, FormEvent } from 'react';
import { api } from '../lib/api';

export default function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    setLoading(true);
    try { setAdmins(await api.listAdmins()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createAdmin(form);
      setShowForm(false);
      setForm({ email: '', password: '' });
      await loadAdmins();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (admins.length <= 1) { setError('Cannot delete the last admin account.'); return; }
    if (!confirm('Delete this admin account?')) return;
    try { await api.deleteAdmin(id); await loadAdmins(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={styles.heading}>Admin Accounts</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.primaryBtn}>
          {showForm ? 'Cancel' : '+ Add Admin'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.card}>
          <h3 style={{ marginBottom: 16 }}>New Admin</h3>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Email *</label>
              <input style={styles.input} type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>Password * (min 8 chars)</label>
              <input style={styles.input} type="password" required minLength={8} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ ...styles.primaryBtn, marginTop: 16 }}>
            {saving ? 'Creating…' : 'Create Admin'}
          </button>
        </form>
      )}

      {loading ? <div style={{ color: '#64748b', marginTop: 24 }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{a.email}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...(a.isActive ? styles.activeBadge : styles.inactiveBadge) }}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button onClick={() => handleDelete(a.id)} style={{ ...styles.actionBtn, color: '#ef4444' }}>Delete</button>
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
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  activeBadge: { background: '#dcfce7', color: '#16a34a' },
  inactiveBadge: { background: '#f1f5f9', color: '#64748b' },
  actionBtn: { padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, marginRight: 6 },
};
