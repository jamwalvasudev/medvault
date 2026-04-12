import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Visit } from '../api';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Visit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.visits.search(query);
      setResults(r);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
        <span style={styles.title}>Search</span>
        <span />
      </header>

      <main style={styles.main}>
        <form onSubmit={handleSearch} style={styles.searchRow}>
          <input
            style={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search visits, doctors, diagnoses…"
            autoFocus
          />
          <button type="submit" style={styles.searchBtn} disabled={loading}>
            {loading ? '…' : 'Search'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        {searched && results.length === 0 && (
          <p style={styles.muted}>No results for "{query}"</p>
        )}

        {results.map((v) => (
          <div key={v.id} style={styles.card} onClick={() => navigate(`/visits/${v.id}`)}>
            <div>
              <span style={styles.date}>{v.visitDate}</span>
              {v.specialty && <span style={styles.tag}>{v.specialty}</span>}
            </div>
            <div style={styles.doctor}>{v.doctorName}</div>
            {v.diagnosis && <div style={styles.diagnosis}>{v.diagnosis}</div>}
            {v.clinic && <div style={styles.clinic}>📍 {v.clinic}</div>}
          </div>
        ))}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', height: 60, background: '#fff', borderBottom: '1px solid #e2e8f0',
  },
  back: { background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 14 },
  title: { fontWeight: 600, fontSize: 16, color: '#0f172a' },
  main: { maxWidth: 720, margin: '0 auto', padding: '32px 16px' },
  searchRow: { display: 'flex', gap: 10, marginBottom: 24 },
  searchInput: {
    flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8,
    fontSize: 15, color: '#0f172a', fontFamily: 'inherit',
  },
  searchBtn: {
    padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
  error: { color: '#ef4444', fontSize: 14 },
  muted: { color: '#94a3b8', fontSize: 14 },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '14px 18px', marginBottom: 10, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  date: { fontSize: 12, color: '#94a3b8', fontWeight: 500, marginRight: 8 },
  tag: { fontSize: 11, background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: 99 },
  doctor: { fontSize: 15, fontWeight: 600, color: '#0f172a' },
  diagnosis: { fontSize: 13, color: '#475569' },
  clinic: { fontSize: 12, color: '#64748b' },
};
