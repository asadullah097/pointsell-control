import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const BUSINESS_TYPES = [
  'retail', 'wholesale', 'hybrid', 'pharmacy', 'grocery', 'cosmetics',
  'bakery', 'electronics', 'hardware', 'restaurant', 'service',
];

const LABEL_TO_BUSINESS_TYPE: Record<string, string> = {
  'Retail POS': 'retail',
  'Restaurant POS': 'restaurant',
  'Pharmacy POS': 'pharmacy',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SignupRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewing, setReviewing] = useState<any | null>(null);

  useEffect(() => { load(); api.listPlans().then(setPlans).catch(() => {}); }, [statusFilter]);

  async function load() {
    setLoading(true);
    setError('');
    try { setRequests(await api.listSignupRequests(statusFilter)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={styles.heading}>Signup Requests</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            "Start free trial" and "Contact sales" submissions from the landing page, awaiting review.
          </p>
        </div>
        {statusFilter === 'pending' && pendingCount > 0 && (
          <span style={{ ...styles.badge, background: '#fef3c7', color: '#b45309' }}>{pendingCount} pending</span>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{ ...styles.filterBtn, ...(statusFilter === s ? styles.filterBtnActive : {}) }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#64748b' }}>Loading…</div> : requests.length === 0 ? (
        <div style={styles.empty}>No {statusFilter !== 'all' ? statusFilter : ''} requests.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Plan requested</th>
              <th style={styles.th}>Submitted</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{r.businessName}</td>
                <td style={styles.td}>
                  <div>{r.fullName}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{r.email} · {r.phone}</div>
                </td>
                <td style={styles.td}>{r.businessType}</td>
                <td style={styles.td}>{r.planCategoryLabel && r.planName ? `${r.planCategoryLabel} — ${r.planName}` : '—'}</td>
                <td style={styles.td}>{timeAgo(r.createdAt)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: STATUS_COLOR[r.status] + '22', color: STATUS_COLOR[r.status] }}>
                    {r.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {r.status === 'pending' && (
                    <button style={styles.actionBtn} onClick={() => setReviewing(r)}>Review</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {reviewing && (
        <ReviewModal
          request={reviewing}
          plans={plans}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ request, plans, onClose, onDone }: { request: any; plans: any[]; onClose: () => void; onDone: () => void }) {
  const [planId, setPlanId] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState(LABEL_TO_BUSINESS_TYPE[request.businessType] ?? '');
  const [provisionPos, setProvisionPos] = useState(true);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any | null>(null);

  async function handleApprove() {
    setBusy(true);
    setError('');
    try {
      const res = await api.approveSignupRequest(request.id, {
        planId: planId || undefined,
        trialDays: Number(trialDays) || undefined,
        slug: slug.trim() || undefined,
        businessTypeOverride: businessType || undefined,
        provisionPos,
      });
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function handleReject() {
    if (!confirm(`Reject the request from "${request.businessName}"? This emails them a decline notice.`)) return;
    setBusy(true);
    setError('');
    try {
      await api.rejectSignupRequest(request.id, reason.trim() || undefined);
      onDone();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {result ? (
          <div>
            <h3 style={{ marginBottom: 12, color: '#1e293b' }}>Request approved</h3>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
              {result.accountCreated
                ? 'A POS account was provisioned and the tenant is now on a trial license.'
                : 'The tenant + trial license were created, but no POS login was provisioned (provisionPos was off).'}
            </p>
            <p style={{ fontSize: 14, color: result.emailSent ? '#10b981' : '#ef4444', marginBottom: 20 }}>
              {result.emailSent ? 'Welcome email sent.' : result.emailError ? `Welcome email failed: ${result.emailError}` : 'No welcome email was sent (no account was provisioned).'}
            </p>
            <button style={styles.primaryBtn} onClick={onDone}>Done</button>
          </div>
        ) : (
          <>
            <h3 style={{ marginBottom: 4, color: '#1e293b' }}>{request.businessName}</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {request.fullName} · {request.email} · {request.phone}
              {request.planCategoryLabel && ` · asked for ${request.planCategoryLabel} — ${request.planName}`}
            </p>
            {request.note && (
              <div style={{ ...styles.noteBox }}>{request.note}</div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Plan to assign</label>
                <select style={styles.input} value={planId} onChange={e => setPlanId(e.target.value)}>
                  <option value="">— none (use default entitlements) —</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Trial length (days)</label>
                <input style={styles.input} type="number" min={1} value={trialDays} onChange={e => setTrialDays(e.target.value)} />
              </div>
              <div>
                <label style={styles.label}>Business type</label>
                <select style={styles.input} value={businessType} onChange={e => setBusinessType(e.target.value)}>
                  <option value="">— select —</option>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={styles.hint}>Auto-mapped from "{request.businessType}" where possible — confirm or correct it.</span>
              </div>
              <div>
                <label style={styles.label}>Subdomain slug</label>
                <input style={styles.input} value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated if blank" />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, color: '#374151' }}>
              <input type="checkbox" checked={provisionPos} onChange={e => setProvisionPos(e.target.checked)} />
              Provision a POS login now (uncheck to just log this as approved, e.g. an enterprise deal you'll set up manually)
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button style={styles.primaryBtn} disabled={busy} onClick={handleApprove}>
                {busy ? 'Working…' : 'Approve & create account'}
              </button>
              <button style={{ ...styles.actionBtn, color: '#ef4444' }} disabled={busy} onClick={onClose}>Cancel</button>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <label style={styles.label}>Reject instead (reason, optional)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={styles.input} value={reason} onChange={e => setReason(e.target.value)} placeholder="Outside service area…" />
                <button style={{ ...styles.actionBtn, color: '#ef4444', whiteSpace: 'nowrap' }} disabled={busy} onClick={handleReject}>Reject</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b' },
  primaryBtn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
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
  actionBtn: { padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: 560, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  hint: { display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 3 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' },
  noteBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 13, color: '#374151', marginBottom: 16 },
};
