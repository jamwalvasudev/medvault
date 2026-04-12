import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type VisitRequest } from '../api';

const empty: VisitRequest = {
  visitDate: new Date().toISOString().slice(0, 10),
  doctorName: '',
  specialty: '',
  clinic: '',
  chiefComplaint: '',
  diagnosis: '',
  notes: '',
};

export default function VisitFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<VisitRequest>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState<{ id: number; name: string }[]>([]);
  const [specialtyFailed, setSpecialtyFailed] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const specialtyInitializedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    api.visits.get(id).then((v) => {
      setForm({
        visitDate: v.visitDate,
        doctorName: v.doctorName,
        specialty: v.specialty ?? '',
        clinic: v.clinic ?? '',
        chiefComplaint: v.chiefComplaint ?? '',
        diagnosis: v.diagnosis ?? '',
        notes: v.notes ?? '',
      });
    }).catch((e) => setError(e.message));
  }, [id]);

  // Load specialty list on mount
  useEffect(() => {
    api.specialties.list()
      .then(setSpecialties)
      .catch(() => setSpecialtyFailed(true));
  }, []);

  // Sync dropdown once when editing: runs when specialties loaded AND form.specialty is known
  useEffect(() => {
    if (specialtyInitializedRef.current || specialties.length === 0) return;
    if (isEdit && !form.specialty) return; // wait for visit data to arrive
    const match = specialties.find((s) => s.name === form.specialty);
    setSelectValue(match ? form.specialty : (form.specialty ? '__other__' : ''));
    if (form.specialty && !match) setCustomSpecialty(form.specialty);
    specialtyInitializedRef.current = true;
  }, [specialties, form.specialty, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const effectiveSpecialty = specialtyFailed
      ? (form.specialty ?? '')
      : selectValue === '__other__'
      ? customSpecialty
      : selectValue;
    const submitData: VisitRequest = { ...form, specialty: effectiveSpecialty };
    try {
      if (isEdit && id) {
        await api.visits.update(id, submitData);
        navigate(`/visits/${id}`);
      } else {
        const v = await api.visits.create(submitData);
        navigate(`/visits/${v.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof VisitRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.back} onClick={() => navigate(-1)}>← Back</button>
        <span style={styles.title}>{isEdit ? 'Edit Visit' : 'New Visit'}</span>
        <span />
      </header>

      <main style={styles.main}>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.row}>
            <label style={styles.label}>
              Date *
              <input type="date" style={styles.input} value={form.visitDate}
                onChange={field('visitDate')} required />
            </label>
            <label style={styles.label}>
              Doctor *
              <input style={styles.input} value={form.doctorName}
                placeholder="Dr. Smith" onChange={field('doctorName')} required />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>
              Specialty
              {specialtyFailed ? (
                <input style={styles.input} value={form.specialty ?? ''}
                  placeholder="GP, Cardiology…" onChange={field('specialty')} />
              ) : (
                <>
                  <select
                    style={styles.input}
                    value={selectValue}
                    onChange={(e) => {
                      setSelectValue(e.target.value);
                      if (e.target.value !== '__other__') setCustomSpecialty('');
                    }}
                  >
                    <option value="">— select specialty —</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="__other__">Other…</option>
                  </select>
                  {selectValue === '__other__' && (
                    <input
                      style={{ ...styles.input, marginTop: 6 }}
                      value={customSpecialty}
                      placeholder="Enter specialty"
                      onChange={(e) => setCustomSpecialty(e.target.value)}
                    />
                  )}
                </>
              )}
            </label>
            <label style={styles.label}>
              Clinic / Hospital
              <input style={styles.input} value={form.clinic ?? ''}
                placeholder="City General Hospital" onChange={field('clinic')} />
            </label>
          </div>

          <label style={styles.labelFull}>
            Chief Complaint
            <input style={styles.input} value={form.chiefComplaint ?? ''}
              placeholder="Why you visited" onChange={field('chiefComplaint')} />
          </label>

          <label style={styles.labelFull}>
            Diagnosis
            <input style={styles.input} value={form.diagnosis ?? ''}
              placeholder="Diagnosis / findings" onChange={field('diagnosis')} />
          </label>

          <label style={styles.labelFull}>
            Notes
            <textarea style={{ ...styles.input, height: 100, resize: 'vertical' }}
              value={form.notes ?? ''} placeholder="Additional notes…"
              onChange={field('notes')} />
          </label>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Visit'}
            </button>
          </div>
        </form>
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
  main: { maxWidth: 640, margin: '0 auto', padding: '32px 16px' },
  form: { background: '#fff', borderRadius: 12, padding: 28, border: '1px solid #e2e8f0' },
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, fontSize: 13, color: '#475569', fontWeight: 500 },
  labelFull: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#475569', fontWeight: 500, marginBottom: 16 },
  input: {
    padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
    fontSize: 14, color: '#0f172a', marginTop: 2, fontFamily: 'inherit',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: {
    padding: '10px 20px', background: 'none', color: '#64748b',
    border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14,
  },
  saveBtn: {
    padding: '10px 24px', background: '#22c55e', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
};
