import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Stats {
  tenants: { total: number; active: number; trial: number; suspended: number };
  licenses: { total: number; active: number; expiringSoon: number; expired: number; revoked: number };
  recentHeartbeats: number;
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', borderTop: `3px solid ${color ?? '#3b82f6'}` }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!stats) return <div style={{ color: '#64748b' }}>Loading…</div>;

  return (
    <div>
      <h2 style={styles.heading}>Dashboard</h2>

      <div style={styles.section}>Businesses</div>
      <div style={styles.grid}>
        <StatCard label="Total Businesses" value={stats.tenants.total} color="#6366f1" />
        <StatCard label="Active" value={stats.tenants.active} color="#10b981" />
        <StatCard label="Trial" value={stats.tenants.trial} color="#f59e0b" />
        <StatCard label="Suspended" value={stats.tenants.suspended} color="#ef4444" />
      </div>

      <div style={styles.section}>Licenses</div>
      <div style={styles.grid}>
        <StatCard label="Total Licenses" value={stats.licenses.total} color="#6366f1" />
        <StatCard label="Active" value={stats.licenses.active} color="#10b981" />
        <StatCard label="Expiring in 30 days" value={stats.licenses.expiringSoon} color="#f59e0b" sub="Needs renewal" />
        <StatCard label="Expired" value={stats.licenses.expired} color="#ef4444" />
      </div>

      <div style={styles.section}>Connectivity</div>
      <div style={styles.grid}>
        <StatCard label="POS Online (48h)" value={stats.recentHeartbeats} color="#0ea5e9" sub="Sent heartbeat recently" />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 24 },
  section: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '28px 0 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
};
