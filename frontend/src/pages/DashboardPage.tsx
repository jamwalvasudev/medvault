import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Visit } from '../api';
import { useAuth } from '../AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.visits
      .list()
      .then((v) => { setVisits(v); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(load, []);

  // Group visits by year
  const byYear = visits.reduce<Record<string, Visit[]>>((acc, v) => {
    const year = v.visitDate.slice(0, 4);
    (acc[year] ??= []).push(v);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>MedHistory</span>
        <div style={styles.headerRight}>
          <button style={styles.searchBtn} onClick={() => navigate('/search')}>Search</button>
          <span style={styles.userInfo}>
            {user?.picture && <img src={user.picture} alt="" style={styles.avatar} />}
            {user?.name}
          </span>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.topRow}>
          <h2 style={styles.sectionTitle}>Your Visits</h2>
          <button style={styles.addBtn} onClick={() => navigate('/visits/new')}>
            + Add Visit
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : visits.length === 0 ? (
          <p style={styles.muted}>No visits yet. Add your first one above.</p>
        ) : (
          years.map((year) => (
            <div key={year}>
              <h3 style={styles.yearLabel}>{year}</h3>
              <ul style={styles.list}>
                {byYear[year].map((v) => (
                  <li key={v.id} style={styles.card} onClick={() => navigate(`/visits/${v.id}`)}>
                    <div style={styles.cardLeft}>
                      <span style={styles.date}>{v.visitDate}</span>
                      <span style={styles.doctor}>{v.doctorName}</span>
                      {v.specialty && <span style={styles.tag}>{v.specialty}</span>}
                      {v.clinic && <span style={styles.clinic}>{v.clinic}</span>}
                    </div>
                    <div style={styles.cardRight}>
                      {v.diagnosis && <p style={styles.diagnosis}>{v.diagnosis}</p>}
                      <span style={styles.chevron}>›</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', height: 60, background: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },
  logo: { fontWeight: 700, fontSize: 18, color: '#0f172a' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  searchBtn: {
    padding: '6px 14px', background: 'none', color: '#3b82f6',
    border: '1px solid #3b82f6', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 14 },
  avatar: { width: 30, height: 30, borderRadius: '50%' },
  main: { maxWidth: 720, margin: '0 auto', padding: '32px 16px' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { margin: 0, fontSize: 22, fontWeight: 600, color: '#0f172a' },
  addBtn: {
    padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
  yearLabel: { fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, marginTop: 24, textTransform: 'uppercase', letterSpacing: 1 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  muted: { color: '#94a3b8', fontSize: 14 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', cursor: 'pointer',
  },
  cardLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  date: { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  doctor: { fontSize: 16, fontWeight: 600, color: '#0f172a' },
  tag: {
    display: 'inline-block', fontSize: 11, background: '#eff6ff',
    color: '#3b82f6', padding: '2px 8px', borderRadius: 99, fontWeight: 500,
  },
  clinic: { fontSize: 12, color: '#64748b' },
  cardRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  diagnosis: { margin: 0, fontSize: 13, color: '#475569' },
  chevron: { fontSize: 20, color: '#cbd5e1' },
};
