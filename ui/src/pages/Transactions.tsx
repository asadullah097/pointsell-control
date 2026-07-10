import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', borderTop: `3px solid ${color ?? '#3b82f6'}` }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantFilter, setTenantFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listTenants().then(setTenants).catch(() => {});
    api.getTransactionSummary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [tenantFilter, from, to]);

  async function load() {
    setLoading(true);
    try {
      const rows = await api.listTransactions({
        tenantId: tenantFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setTransactions(rows);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const money = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div>
      <h2 style={styles.heading}>Transactions</h2>

      {error && <div style={styles.error}>{error}</div>}

      {summary && (
        <>
          <div style={styles.section}>Revenue</div>
          <div style={styles.grid}>
            <StatCard label="Month to Date" value={money(summary.monthToDate)} color="#10b981" />
            <StatCard label="Year to Date" value={money(summary.yearToDate)} color="#6366f1" />
            <StatCard label="Monthly Plans" value={money(summary.byCycle.monthly)} color="#3b82f6" sub="Total from monthly-cycle payments" />
            <StatCard label="Yearly Plans" value={money(summary.byCycle.yearly)} color="#f59e0b" sub="Total from yearly-cycle payments" />
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 16px' }}>
        <h3 style={styles.sectionHeading}>Payment History</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={styles.input} value={tenantFilter} onChange={e => setTenantFilter(e.target.value)}>
            <option value="">All businesses</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.businessName}</option>)}
          </select>
          <input style={styles.input} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <input style={styles.input} type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {loading ? <div style={{ color: '#64748b' }}>Loading…</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Cycle</th>
              <th style={styles.th}>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} style={styles.tr}>
                <td style={styles.td}>{new Date(t.createdAt).toLocaleString()}</td>
                <td style={{ ...styles.td, fontWeight: 600, cursor: 'pointer', color: '#3b82f6' }}
                  onClick={() => navigate(`/tenants/${t.tenantId}`)}>
                  {t.tenant?.businessName ?? '—'}
                </td>
                <td style={styles.td}><span style={{ textTransform: 'capitalize' }}>{t.type}</span></td>
                <td style={styles.td}>{t.plan?.name ?? '—'}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{money(Number(t.amount))}</td>
                <td style={styles.td}>{t.billingCycle}</td>
                <td style={styles.td}>{t.recordedByAdminEmail ?? '—'}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No transactions found</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 24 },
  section: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '28px 0 12px' },
  sectionHeading: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  thead: { background: '#f8fafc' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: 14, color: '#1e293b' },
};
