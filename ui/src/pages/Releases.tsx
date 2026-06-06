import { useEffect, useState, FormEvent } from 'react';
import { api } from '../lib/api';

export default function ReleasesPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    version: '', channel: 'local', notes: '', downloadUrl: '', sha256: '', signature: '', published: false,
  });

  useEffect(() => { loadReleases(); }, []);

  async function loadReleases() {
    setLoading(true);
    try { setReleases(await api.listReleases()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createRelease(form);
      setShowForm(false);
      setForm({ version: '', channel: 'local', notes: '', downloadUrl: '', sha256: '', signature: '', published: false });
      await loadReleases();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function togglePublish(r: any) {
    try {
      if (r.published) await api.unpublishRelease(r.id);
      else await api.publishRelease(r.id);
      await loadReleases();
    } catch (e: any) { setError(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this release record?')) return;
    try { await api.deleteRelease(id); await loadReleases(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={styles.heading}>Releases</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.primaryBtn}>
          {showForm ? 'Cancel' : '+ New Release'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.card}>
          <h3 style={{ marginBottom: 16 }}>Create Release</h3>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Version *</label>
              <input style={styles.input} required value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.2.0" />
            </div>
            <div>
              <label style={styles.label}>Channel</label>
              <select style={styles.input} value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                <option value="local">local</option>
                <option value="cloud">cloud</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={styles.label}>Download URL *</label>
              <input style={styles.input} required value={form.downloadUrl}
                onChange={e => setForm(f => ({ ...f, downloadUrl: e.target.value }))}
                placeholder="https://releases.pointsell.app/v1.2.0/PointSell-v1.2.0-local.zip" />
            </div>
            <div>
              <label style={styles.label}>SHA-256 *</label>
              <input style={styles.input} required value={form.sha256}
                onChange={e => setForm(f => ({ ...f, sha256: e.target.value }))} placeholder="abc123..." />
            </div>
            <div>
              <label style={styles.label}>Signature *</label>
              <input style={styles.input} required value={form.signature}
                onChange={e => setForm(f => ({ ...f, signature: e.target.value }))} placeholder="base64url signature from sign-manifest.js" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={styles.label}>Release Notes</label>
              <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Bug fixes and performance improvements." />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <input type="checkbox" id="pub" checked={form.published}
              onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
            <label htmlFor="pub" style={styles.label}>Publish immediately</label>
          </div>
          <button type="submit" disabled={saving} style={{ ...styles.primaryBtn, marginTop: 16 }}>
            {saving ? 'Creating…' : 'Create Release'}
          </button>
        </form>
      )}

      {loading ? <div style={{ color: '#64748b', marginTop: 24 }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Version</th>
              <th style={styles.th}>Channel</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Notes</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {releases.map(r => (
              <tr key={r.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 700 }}>v{r.version}</td>
                <td style={styles.td}><span style={styles.tag}>{r.channel}</span></td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...(r.published ? styles.publishedBadge : styles.draftBadge) }}>
                    {r.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.notes ?? '—'}
                </td>
                <td style={styles.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button onClick={() => togglePublish(r)} style={{ ...styles.actionBtn, color: r.published ? '#ef4444' : '#10b981' }}>
                    {r.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => handleDelete(r.id)} style={{ ...styles.actionBtn, color: '#94a3b8' }}>Delete</button>
                </td>
              </tr>
            ))}
            {releases.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No releases yet</td></tr>
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
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  publishedBadge: { background: '#dcfce7', color: '#16a34a' },
  draftBadge: { background: '#f1f5f9', color: '#64748b' },
  tag: { padding: '2px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: 6, fontSize: 12, fontWeight: 500 },
  actionBtn: { padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, marginRight: 6 },
};
