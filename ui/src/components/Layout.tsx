import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tenants', label: 'Businesses' },
  { to: '/releases', label: 'Releases' },
  { to: '/admins', label: 'Admins' },
];

export default function Layout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>PointSell<br /><small>Control Panel</small></div>
        <nav>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navActive : {}) })}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220, background: '#1e293b', color: '#f8fafc', display: 'flex',
    flexDirection: 'column', padding: '24px 0', position: 'fixed', height: '100vh',
  },
  logo: {
    padding: '0 24px 32px', fontSize: 18, fontWeight: 700,
    letterSpacing: '-0.5px', lineHeight: 1.3,
  },
  navLink: {
    display: 'block', padding: '10px 24px', color: '#94a3b8',
    textDecoration: 'none', fontSize: 14, fontWeight: 500,
  },
  navActive: { color: '#f8fafc', background: '#0f172a', borderLeft: '3px solid #3b82f6' },
  logoutBtn: {
    marginTop: 'auto', margin: '24px', padding: '8px 16px', background: 'transparent',
    border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, cursor: 'pointer', fontSize: 13,
  },
  main: { marginLeft: 220, padding: 32, flex: 1, maxWidth: 'calc(100vw - 220px)' },
};
