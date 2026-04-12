import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  api,
  type Visit, type Medication, type MedicationRequest,
  type Recommendation, type RecommendationRequest,
  type Attachment, type MedicationReminder,
} from '../api';

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [error, setError] = useState('');

  // medication form
  const [medForm, setMedForm] = useState<MedicationRequest>({ name: '' });
  const [showMedForm, setShowMedForm] = useState(false);
  const [savingMed, setSavingMed] = useState(false);

  // recommendation form
  const [recForm, setRecForm] = useState<RecommendationRequest>({ title: '' });
  const [showRecForm, setShowRecForm] = useState(false);
  const [savingRec, setSavingRec] = useState(false);

  // reminder form per medication
  const [reminderForm, setReminderForm] = useState<Record<string, string>>({});
  const [savingReminder, setSavingReminder] = useState<string | null>(null);

  // file upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.visits.get(id),
      api.medications.list(id),
      api.recommendations.list(id),
      api.attachments.list(id),
      api.reminders.list(),
    ]).then(([v, m, r, a, rem]) => {
      setVisit(v);
      setMeds(m);
      setRecs(r);
      setAttachments(a);
      setReminders(rem);
    }).catch((e) => setError(e.message));
  }, [id]);

  if (!visit && !error) return <p style={{ padding: 32, fontFamily: 'system-ui' }}>Loading…</p>;

  const handleDelete = async () => {
    if (!id || !confirm('Delete this visit?')) return;
    await api.visits.delete(id).catch((e) => setError(e.message));
    navigate('/');
  };

  const saveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingMed(true);
    try {
      const m = await api.medications.create(id, medForm);
      setMeds([...meds, m]);
      setMedForm({ name: '' });
      setShowMedForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingMed(false);
    }
  };

  const deleteMed = async (medId: string) => {
    if (!id) return;
    await api.medications.delete(id, medId).catch((e) => setError(e.message));
    setMeds(meds.filter((m) => m.id !== medId));
    setReminders(reminders.filter((r) => r.medicationId !== medId));
  };

  const saveRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingRec(true);
    try {
      const r = await api.recommendations.create(id, recForm);
      setRecs([...recs, r]);
      setRecForm({ title: '' });
      setShowRecForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingRec(false);
    }
  };

  const deleteRec = async (recId: string) => {
    if (!id) return;
    await api.recommendations.delete(id, recId).catch((e) => setError(e.message));
    setRecs(recs.filter((r) => r.id !== recId));
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const a = await api.attachments.upload(id, file);
      setAttachments([...attachments, a]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openAttachment = async (attachId: string) => {
    if (!id) return;
    try {
      const { url } = await api.attachments.presign(id, attachId);
      window.open(url, '_blank');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to open');
    }
  };

  const deleteAttachment = async (attachId: string) => {
    if (!id) return;
    await api.attachments.delete(id, attachId).catch((e) => setError(e.message));
    setAttachments(attachments.filter((a) => a.id !== attachId));
  };

  const saveReminder = async (medId: string) => {
    const time = reminderForm[medId];
    if (!time) return;
    setSavingReminder(medId);
    try {
      const r = await api.reminders.create({ medicationId: medId, reminderTime: time });
      setReminders([...reminders, r]);
      setReminderForm({ ...reminderForm, [medId]: '' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingReminder(null);
    }
  };

  const toggleReminder = async (remId: string) => {
    try {
      const updated = await api.reminders.toggle(remId);
      setReminders(reminders.map((r) => r.id === remId ? updated : r));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const deleteReminder = async (remId: string) => {
    await api.reminders.delete(remId).catch((e) => setError(e.message));
    setReminders(reminders.filter((r) => r.id !== remId));
  };

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
        <span style={styles.headerTitle}>Visit Detail</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.editBtn} onClick={() => navigate(`/visits/${id}/edit`)}>Edit</button>
          <button style={styles.deleteBtn} onClick={handleDelete}>Delete</button>
        </div>
      </header>

      <main style={styles.main}>
        {error && <p style={styles.error}>{error}</p>}

        {visit && (
          <div style={styles.visitCard}>
            <div style={styles.visitMeta}>
              <span style={styles.date}>{visit.visitDate}</span>
              {visit.specialty && <span style={styles.tag}>{visit.specialty}</span>}
            </div>
            <h2 style={styles.doctor}>{visit.doctorName}</h2>
            {visit.clinic && <p style={styles.meta}>📍 {visit.clinic}</p>}
            {visit.chiefComplaint && <p style={styles.meta}><strong>Complaint:</strong> {visit.chiefComplaint}</p>}
            {visit.diagnosis && <p style={styles.meta}><strong>Diagnosis:</strong> {visit.diagnosis}</p>}
            {visit.notes && <p style={styles.notes}>{visit.notes}</p>}
          </div>
        )}

        {/* Medications */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Medications</h3>
            <button style={styles.addBtn} onClick={() => setShowMedForm((s) => !s)}>
              {showMedForm ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showMedForm && (
            <form onSubmit={saveMed} style={styles.inlineForm}>
              <div style={styles.formRow}>
                <input style={styles.input} placeholder="Medication name *" required
                  value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} />
                <input style={styles.input} placeholder="Dosage (e.g. 10mg)"
                  value={medForm.dosage ?? ''} onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })} />
                <input style={styles.input} placeholder="Frequency (e.g. twice daily)"
                  value={medForm.frequency ?? ''} onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })} />
              </div>
              <button type="submit" style={styles.saveBtn} disabled={savingMed}>
                {savingMed ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}

          {meds.length === 0 && !showMedForm && <p style={styles.empty}>No medications recorded.</p>}

          {meds.map((m) => {
            const medReminders = reminders.filter((r) => r.medicationId === m.id);
            return (
              <div key={m.id} style={styles.itemCard}>
                <div style={styles.itemMain}>
                  <span style={styles.itemName}>{m.name}</span>
                  {m.dosage && <span style={styles.itemDetail}>{m.dosage}</span>}
                  {m.frequency && <span style={styles.itemDetail}>{m.frequency}</span>}
                  <button style={styles.delBtn} onClick={() => deleteMed(m.id)}>×</button>
                </div>
                {/* Reminders for this med */}
                <div style={styles.reminderSection}>
                  {medReminders.map((r) => (
                    <div key={r.id} style={styles.reminderRow}>
                      <span style={styles.reminderTime}>⏰ {r.reminderTime}</span>
                      <button style={{ ...styles.toggleBtn, color: r.enabled ? '#22c55e' : '#94a3b8' }}
                        onClick={() => toggleReminder(r.id)}>
                        {r.enabled ? 'On' : 'Off'}
                      </button>
                      <button style={styles.delBtn} onClick={() => deleteReminder(r.id)}>×</button>
                    </div>
                  ))}
                  <div style={styles.reminderAdd}>
                    <input type="time" style={{ ...styles.input, width: 120 }}
                      value={reminderForm[m.id] ?? ''}
                      onChange={(e) => setReminderForm({ ...reminderForm, [m.id]: e.target.value })} />
                    <button style={styles.saveBtn} disabled={savingReminder === m.id}
                      onClick={() => saveReminder(m.id)}>
                      {savingReminder === m.id ? '…' : '+ Reminder'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Recommendations */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recommendations</h3>
            <button style={styles.addBtn} onClick={() => setShowRecForm((s) => !s)}>
              {showRecForm ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showRecForm && (
            <form onSubmit={saveRec} style={styles.inlineForm}>
              <input style={styles.input} placeholder="Title *" required
                value={recForm.title} onChange={(e) => setRecForm({ ...recForm, title: e.target.value })} />
              <input style={{ ...styles.input, marginTop: 8 }} placeholder="Description (optional)"
                value={recForm.description ?? ''} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} />
              <input type="date" style={{ ...styles.input, marginTop: 8 }}
                value={recForm.followUpDate ?? ''} onChange={(e) => setRecForm({ ...recForm, followUpDate: e.target.value })} />
              <button type="submit" style={{ ...styles.saveBtn, marginTop: 10 }} disabled={savingRec}>
                {savingRec ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}

          {recs.length === 0 && !showRecForm && <p style={styles.empty}>No recommendations recorded.</p>}

          {recs.map((r) => (
            <div key={r.id} style={styles.itemCard}>
              <div style={styles.itemMain}>
                <span style={styles.itemName}>{r.title}</span>
                {r.followUpDate && <span style={styles.itemDetail}>Follow up: {r.followUpDate}</span>}
                <button style={styles.delBtn} onClick={() => deleteRec(r.id)}>×</button>
              </div>
              {r.description && <p style={styles.itemDesc}>{r.description}</p>}
            </div>
          ))}
        </section>

        {/* Attachments */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Attachments</h3>
            <button style={styles.addBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : '+ Upload'}
            </button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
          </div>

          {attachments.length === 0 && <p style={styles.empty}>No attachments.</p>}

          {attachments.map((a) => (
            <div key={a.id} style={styles.itemCard}>
              <div style={styles.itemMain}>
                <button style={styles.filenameBtn} onClick={() => openAttachment(a.id)}>
                  📄 {a.filename}
                </button>
                <span style={styles.itemDetail}>{formatBytes(a.sizeBytes)}</span>
                <button style={styles.delBtn} onClick={() => deleteAttachment(a.id)}>×</button>
              </div>
            </div>
          ))}
        </section>
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
  headerTitle: { fontWeight: 600, fontSize: 16, color: '#0f172a' },
  editBtn: { padding: '6px 14px', background: 'none', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  deleteBtn: { padding: '6px 14px', background: 'none', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  main: { maxWidth: 720, margin: '0 auto', padding: '32px 16px' },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  visitCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', marginBottom: 24 },
  visitMeta: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  tag: { fontSize: 11, background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: 99, fontWeight: 500 },
  doctor: { margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' },
  meta: { margin: '4px 0', fontSize: 14, color: '#475569' },
  notes: { margin: '8px 0 0', fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap' },
  section: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' },
  addBtn: { padding: '5px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  inlineForm: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 },
  formRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  input: { padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, color: '#0f172a', fontFamily: 'inherit', flex: 1, minWidth: 120 },
  saveBtn: { padding: '7px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  empty: { color: '#94a3b8', fontSize: 13, margin: 0 },
  itemCard: { border: '1px solid #f1f5f9', borderRadius: 8, padding: '10px 14px', marginBottom: 8 },
  itemMain: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemName: { fontWeight: 600, fontSize: 14, color: '#0f172a' },
  itemDetail: { fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 },
  itemDesc: { margin: '6px 0 0', fontSize: 13, color: '#475569' },
  delBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1 },
  filenameBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 14, padding: 0, textAlign: 'left' },
  reminderSection: { marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' },
  reminderRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  reminderTime: { fontSize: 13, color: '#475569' },
  toggleBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  reminderAdd: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 },
};
