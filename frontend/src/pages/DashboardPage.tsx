import { useEffect, useState } from 'react';
import { api, Visit, VisitRequest } from '../api';
import { useAuth } from '../AuthContext';

const emptyForm: VisitRequest = {
  visitDate: new Date().toISOString().slice(0, 10),
  doctorName: '',
  specialty: '',
  diagnosis: '',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<VisitRequest>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    api.visits
      .list()
      .then((v) => { setVisits(v); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorName || !form.visitDate) return;
    setSubmitting(true);
    try {
      await api.visits.create(form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this visit?')) return;
    await api.visits.delete(id).catch((e) => setError(e.message));
    load();
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>MedHistory</span>
        <span style={styles.userInfo}>
          {user?.picture && (
            <img src={user.picture} alt="" style={styles.avatar} />
          )}
          {user?.name}
        </span>
      </header>

      <main style={styles.main}>
        <div style={styles.topRow}>
          <h2 style={styles.sectionTitle}>Your Visits</h2>
          <button style={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Visit'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <label style={styles.label}>
                Date *
                <input
                  type="date"
                  style={styles.input}
                  value={form.visitDate}
                  onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                  required
                />
              </label>
              <label style={styles.label}>
                Doctor *
                <input
                  style={styles.input}
                  value={form.doctorName}
                  placeholder="Dr Smith"
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  required
                />
              </label>
            </div>
            <div style={styles.row}>
              <label style={styles.label}>
                Specialty
                <input
                  style={styles.input}
                  value={form.specialty}
                  placeholder="GP, Dermatology…"
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Diagnosis
                <input
                  style={styles.input}
                  value={form.diagnosis}
                  placeholder="Viral fever…"
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                />
              </label>
            </div>
            <button type="submit" style={styles.saveBtn} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Visit'}
            </button>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : visits.length === 0 ? (
          <p style={styles.muted}>No visits yet. Add your first one above.</p>
        ) : (
          <ul style={styles.list}>
            {visits.map((v) => (
              <li key={v.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <span style={styles.date}>{v.visitDate}</span>
                  <span style={styles.doctor}>{v.doctorName}</span>
                  {v.specialty && <span style={styles.tag}>{v.specialty}</span>}
                </div>
                <div style={styles.cardRight}>
                  {v.diagnosis && <p style={styles.diagnosis}>{v.diagnosis}</p>}
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(v.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 14 },
  avatar: { width: 30, height: 30, borderRadius: '50%' },
  main: { maxWidth: 720, margin: '0 auto', padding: '32px 16px' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { margin: 0, fontSize: 22, fontWeight: 600, color: '#0f172a' },
  addBtn: {
    padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
  form: {
    background: '#fff', borderRadius: 12, padding: 24,
    border: '1px solid #e2e8f0', marginBottom: 24,
  },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, fontSize: 13, color: '#475569', fontWeight: 500 },
  input: {
    padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
    fontSize: 14, color: '#0f172a', marginTop: 2,
  },
  saveBtn: {
    padding: '10px 24px', background: '#22c55e', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  muted: { color: '#94a3b8', fontSize: 14 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cardLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  date: { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  doctor: { fontSize: 16, fontWeight: 600, color: '#0f172a' },
  tag: {
    display: 'inline-block', fontSize: 11, background: '#eff6ff',
    color: '#3b82f6', padding: '2px 8px', borderRadius: 99, fontWeight: 500,
  },
  cardRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  diagnosis: { margin: 0, fontSize: 13, color: '#475569' },
  deleteBtn: {
    fontSize: 12, color: '#ef4444', background: 'none', border: 'none',
    cursor: 'pointer', padding: 0,
  },
};
