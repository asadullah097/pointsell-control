import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_COLOR: Record<string, string> = {
  open: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  closed: '#94a3b8',
  reopened: '#ef4444',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 15_000);
    return () => clearInterval(interval);
  }, []);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try { setTickets(await api.listTickets()); }
    catch (e: any) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }

  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'reopened').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={styles.heading}>Support Tickets</h2>
        {openCount > 0 && (
          <span style={{ ...styles.badge, background: '#fef3c7', color: '#b45309' }}>
            {openCount} awaiting reply
          </span>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'open', 'in_progress', 'resolved', 'closed', 'reopened'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              ...styles.filterBtn,
              ...(statusFilter === s ? styles.filterBtnActive : {}),
            }}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#64748b' }}>Loading…</div> : filtered.length === 0 ? (
        <div style={styles.empty}>No tickets{statusFilter !== 'all' ? ` with status "${STATUS_LABEL[statusFilter]}"` : ''}.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>From</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={`${t.tenantId}-${t.id}`} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600, cursor: 'pointer', color: '#3b82f6' }}
                  onClick={() => navigate(`/tickets/${t.tenantSlug}/${t.id}`)}>
                  {t.subject}
                </td>
                <td style={styles.td}>{t.tenantName ?? '—'}</td>
                <td style={styles.td}>{t.createdByEmail ?? t.createdByName ?? '—'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </td>
                <td style={styles.td}>{timeAgo(t.lastMessageAt)}</td>
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
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  empty: { color: '#64748b', padding: '40px 0', textAlign: 'center' as const },
  filterBtn: { padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 20, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b' },
  filterBtnActive: { background: '#1e293b', color: '#fff', border: '1px solid #1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
};
