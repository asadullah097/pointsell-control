import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_COLOR: Record<string, string> = {
  open: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981', closed: '#94a3b8', reopened: '#ef4444',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TicketDetailPage() {
  const { slug, ticketId } = useParams<{ slug: string; ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load();
    // Picks up customer-side replies without a manual page reload.
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [slug, ticketId]);

  async function load() {
    try { setTicket(await api.getTicket(slug!, ticketId!)); }
    catch (e: any) { setError(e.message); }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.replyTicket(slug!, ticketId!, reply.trim());
      setReply('');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  }

  async function handleStatus(status: 'in_progress' | 'resolved' | 'closed') {
    try {
      await api.updateTicketStatus(slug!, ticketId!, status);
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function handleOpenAttachment(attachmentId: string) {
    try {
      const objectUrl = await api.fetchTicketAttachment(slug!, ticketId!, attachmentId);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) { setError(e.message); }
  }

  if (!ticket) {
    return (
      <div>
        {error && <div style={styles.error}>{error}</div>}
        {!error && <div style={{ color: '#64748b' }}>Loading…</div>}
        <button onClick={() => navigate('/tickets')} style={{ ...styles.backBtn, marginTop: 12 }}>&larr; All Tickets</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/tickets')} style={styles.backBtn}>&larr; All Tickets</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12, marginBottom: 20 }}>
        <div>
          <h2 style={styles.heading}>{ticket.subject}</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            {ticket.createdByEmail ?? ticket.createdByName ?? 'Unknown'} · Opened {fmt(ticket.createdAt)}
          </p>
        </div>
        <span style={{ ...styles.badge, background: STATUS_COLOR[ticket.status] + '22', color: STATUS_COLOR[ticket.status] }}>
          {STATUS_LABEL[ticket.status] ?? ticket.status}
        </span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => handleStatus('in_progress')} disabled={ticket.status === 'in_progress' || ticket.status === 'closed'} style={styles.actionBtn}>
          Mark In Progress
        </button>
        <button onClick={() => handleStatus('resolved')} disabled={ticket.status === 'resolved' || ticket.status === 'closed'} style={{ ...styles.actionBtn, color: '#10b981' }}>
          Mark Resolved
        </button>
        <button onClick={() => handleStatus('closed')} disabled={ticket.status === 'closed'} style={{ ...styles.actionBtn, color: '#64748b' }}>
          Close Ticket
        </button>
      </div>

      <div style={styles.thread}>
        {(ticket.messages ?? []).map((m: any) => (
          <div key={m.id} style={{ ...styles.message, ...(m.senderType === 'admin' ? styles.messageAdmin : {}) }}>
            <div style={styles.messageHeader}>
              <span style={{ fontWeight: 600, color: m.senderType === 'admin' ? '#3b82f6' : '#1e293b' }}>
                {m.senderName ?? (m.senderType === 'admin' ? 'Support Team' : 'Customer')}
              </span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{fmt(m.createdAt)}</span>
            </div>
            <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' as const }}>{m.body}</p>
            {m.attachments?.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {m.attachments.map((a: any) => (
                  <button key={a.id} onClick={() => handleOpenAttachment(a.id)} style={{ ...styles.attachmentChip, cursor: 'pointer', border: 'none' }}>
                    📎 {a.originalFilename ?? a.storageKey.split('/').pop()}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {ticket.status === 'closed' ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
          This ticket is closed and no longer accepts replies.
        </div>
      ) : (
        <form onSubmit={handleReply} style={styles.replyForm}>
          <textarea
            style={styles.textarea}
            rows={3}
            placeholder="Type a reply…"
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <button type="submit" disabled={sending || !reply.trim()} style={styles.primaryBtn}>
            {sending ? 'Sending…' : 'Send Reply'}
          </button>
        </form>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 20, fontWeight: 700, color: '#1e293b' },
  backBtn: { background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 500 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, height: 'fit-content' },
  actionBtn: { padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#1e293b' },
  thread: { display: 'flex', flexDirection: 'column' as const, gap: 12, marginBottom: 20 },
  message: { background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  messageAdmin: { background: '#eff6ff', border: '1px solid #bfdbfe' },
  messageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  attachmentChip: { fontSize: 12, background: '#f1f5f9', padding: '3px 10px', borderRadius: 6, color: '#475569' },
  replyForm: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  textarea: { width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical' as const },
  primaryBtn: { alignSelf: 'flex-end', padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
