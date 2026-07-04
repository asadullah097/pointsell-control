import { useEffect, useState, FormEvent } from 'react';
import { api } from '../lib/api';

const emptyForm = {
  key: '', name: '', description: '', maxUsers: '', maxLocations: '',
  price: '0', billingCycle: 'monthly', durationDays: '30', sortOrder: '0',
};

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    try { setPlans(await api.listPlans()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({
      key: p.key, name: p.name, description: p.description ?? '',
      maxUsers: p.maxUsers === null ? '' : String(p.maxUsers),
      maxLocations: p.maxLocations === null ? '' : String(p.maxLocations),
      price: String(p.price), billingCycle: p.billingCycle,
      durationDays: String(p.durationDays), sortOrder: String(p.sortOrder),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        maxUsers: form.maxUsers.trim() === '' ? null : Number(form.maxUsers),
        maxLocations: form.maxLocations.trim() === '' ? null : Number(form.maxLocations),
        price: Number(form.price) || 0,
        billingCycle: form.billingCycle,
        durationDays: Number(form.durationDays) || 30,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editId) await api.updatePlan(editId, body);
      else await api.createPlan(body);
      setShowForm(false);
      await loadPlans();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(p: any) {
    if (!confirm(`Delete plan "${p.name}"? If any tenant/license references it, it will be hidden instead of deleted.`)) return;
    try {
      const res = await api.deletePlan(p.id);
      if (res.softHidden) alert(`"${p.name}" is still in use — hidden from new assignments instead of deleted.`);
      await loadPlans();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={styles.heading}>Plans</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            The package catalog — what a business gets for their seat/location limits when assigned a plan.
          </p>
        </div>
        <button onClick={showForm ? () => setShowForm(false) : openCreate} style={styles.primaryBtn}>
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.card}>
          <h3 style={{ marginBottom: 20, color: '#1e293b' }}>{editId ? 'Edit Plan' : 'New Plan'}</h3>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Key *</label>
              <input style={styles.input} required disabled={!!editId} value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                placeholder="basic" />
              <span style={styles.hint}>Lowercase, unique, never changes once tenants use it</span>
            </div>
            <div>
              <label style={styles.label}>Display Name *</label>
              <input style={styles.input} required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Basic" />
            </div>
            <div>
              <label style={styles.label}>Max Users</label>
              <input style={styles.input} type="number" min={0} value={form.maxUsers}
                onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} placeholder="Leave blank = unlimited" />
            </div>
            <div>
              <label style={styles.label}>Max Locations</label>
              <input style={styles.input} type="number" min={0} value={form.maxLocations}
                onChange={e => setForm(f => ({ ...f, maxLocations: e.target.value }))} placeholder="Leave blank = unlimited" />
            </div>
            <div>
              <label style={styles.label}>Price</label>
              <input style={styles.input} type="number" min={0} step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>Billing Cycle</label>
              <select style={styles.input} value={form.billingCycle}
                onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Duration (days)</label>
              <input style={styles.input} type="number" min={1} required value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} />
              <span style={styles.hint}>License validity granted per purchase/renewal</span>
            </div>
            <div>
              <label style={styles.label}>Sort Order</label>
              <input style={styles.input} type="number" value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Description</label>
            <input style={styles.input} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="For a single shop with one cashier." />
          </div>
          <button type="submit" disabled={saving} style={{ ...styles.primaryBtn, marginTop: 16 }}>
            {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Plan'}
          </button>
        </form>
      )}

      {loading ? <div style={{ color: '#64748b', marginTop: 24 }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Key</th>
              <th style={styles.th}>Max Users</th>
              <th style={styles.th}>Max Locations</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{p.name}</td>
                <td style={styles.td}><span style={styles.slugBadge}>{p.key}</span></td>
                <td style={styles.td}>{p.maxUsers === null ? 'Unlimited' : p.maxUsers}</td>
                <td style={styles.td}>{p.maxLocations === null ? 'Unlimited' : p.maxLocations}</td>
                <td style={styles.td}>{p.price > 0 ? `$${Number(p.price).toFixed(2)}/${p.billingCycle === 'yearly' ? 'yr' : 'mo'}` : 'Free'}</td>
                <td style={styles.td}>{p.durationDays}d</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: p.isActive ? '#10b98122' : '#94a3b822', color: p.isActive ? '#10b981' : '#94a3b8' }}>
                    {p.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button onClick={() => openEdit(p)} style={styles.actionBtn}>Edit</button>
                  <button onClick={() => handleDelete(p)} style={{ ...styles.actionBtn, color: '#ef4444' }}>Delete</button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No plans yet</td></tr>
            )}
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
