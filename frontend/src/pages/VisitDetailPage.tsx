import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BellOutlined, CloseOutlined, DeleteOutlined, EnvironmentOutlined,
  FileOutlined, FileTextOutlined, MedicineBoxOutlined, PaperClipOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert, App, Button, Card, Divider, Flex, Input, Skeleton, Switch, Tabs, Tag, Typography,
} from 'antd';
import {
  api,
  type Attachment, type Medication, type MedicationReminder, type MedicationRequest,
  type Recommendation, type RecommendationRequest, type Visit,
} from '@/api';
import PageHeader from '@/components/PageHeader';

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showMedForm, setShowMedForm] = useState(false);
  const [medForm, setMedForm] = useState<MedicationRequest>({ name: '' });
  const [savingMed, setSavingMed] = useState(false);

  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm] = useState<RecommendationRequest>({ title: '' });
  const [savingRec, setSavingRec] = useState(false);

  const [reminderTime, setReminderTime] = useState<Record<string, string>>({});
  const [savingReminder, setSavingReminder] = useState<string | null>(null);

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
      setVisit(v); setMeds(m); setRecs(r); setAttachments(a); setReminders(rem);
      setLoading(false);
    }).catch((e) => { setPageError(e.message); setLoading(false); });
  }, [id]);

  const handleDeleteVisit = () => {
    modal.confirm({
      title: 'Delete this visit?',
      content: 'This permanently removes the visit and all its medications, recommendations, and attachments. This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        if (!id) return;
        await api.visits.delete(id).catch((e) => setPageError(e.message));
        message.success('Visit deleted');
        navigate('/');
      },
    });
  };

  const saveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingMed(true);
    try {
      const m = await api.medications.create(id, medForm);
      setMeds((prev) => [...prev, m]);
      setMedForm({ name: '' });
      setShowMedForm(false);
      message.success('Medication added');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally { setSavingMed(false); }
  };

  const deleteMed = async (medId: string) => {
    if (!id) return;
    await api.medications.delete(id, medId).catch((e) => setPageError(e.message));
    setMeds((prev) => prev.filter((m) => m.id !== medId));
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
    message.success('Medication removed');
  };

  const saveRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingRec(true);
    try {
      const r = await api.recommendations.create(id, recForm);
      setRecs((prev) => [...prev, r]);
      setRecForm({ title: '' });
      setShowRecForm(false);
      message.success('Recommendation added');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally { setSavingRec(false); }
  };

  const deleteRec = async (recId: string) => {
    if (!id) return;
    await api.recommendations.delete(id, recId).catch((e) => setPageError(e.message));
    setRecs((prev) => prev.filter((r) => r.id !== recId));
    message.success('Recommendation removed');
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const a = await api.attachments.upload(id, file);
      setAttachments((prev) => [...prev, a]);
      message.success('File uploaded');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const openAttachment = async (attachId: string) => {
    if (!id) return;
    try {
      const { url } = await api.attachments.presign(id, attachId);
      window.open(url, '_blank');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed to open');
    }
  };

  const deleteAttachment = async (attachId: string) => {
    if (!id) return;
    await api.attachments.delete(id, attachId).catch((e) => setPageError(e.message));
    setAttachments((prev) => prev.filter((a) => a.id !== attachId));
    message.success('Attachment removed');
  };

  const saveReminder = async (medId: string) => {
    const time = reminderTime[medId];
    if (!time) return;
    setSavingReminder(medId);
    try {
      const r = await api.reminders.create({ medicationId: medId, reminderTime: time });
      setReminders((prev) => [...prev, r]);
      setReminderTime((prev) => ({ ...prev, [medId]: '' }));
      message.success('Reminder set');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally { setSavingReminder(null); }
  };

  const toggleReminder = async (remId: string) => {
    try {
      const updated = await api.reminders.toggle(remId);
      setReminders((prev) => prev.map((r) => (r.id === remId ? updated : r)));
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const deleteReminder = async (remId: string) => {
    await api.reminders.delete(remId).catch((e) => setPageError(e.message));
    setReminders((prev) => prev.filter((r) => r.id !== remId));
    message.success('Reminder removed');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <PageHeader title="Visit Detail" backHref="/" />
        <main style={{ width: '100%', maxWidth: 672, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton active />
          <Skeleton active />
          <Skeleton active />
        </main>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'medications',
      label: <Flex align="center" gap={6}><MedicineBoxOutlined /><span>Meds</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button icon={showMedForm ? <CloseOutlined /> : <PlusOutlined />} onClick={() => setShowMedForm((s) => !s)}>
              {showMedForm ? 'Cancel' : 'Add'}
            </Button>
          </Flex>
          {showMedForm && (
            <Card>
              <form onSubmit={saveMed}>
                <Flex vertical gap={12}>
                  <Input placeholder="Medication name *" required value={medForm.name}
                    onChange={(e) => setMedForm((p) => ({ ...p, name: e.target.value }))} />
                  <Flex gap={12}>
                    <Input placeholder="Dosage (e.g. 10mg)" value={medForm.dosage ?? ''}
                      onChange={(e) => setMedForm((p) => ({ ...p, dosage: e.target.value }))} />
                    <Input placeholder="Frequency (e.g. once daily)" value={medForm.frequency ?? ''}
                      onChange={(e) => setMedForm((p) => ({ ...p, frequency: e.target.value }))} />
                  </Flex>
                  <Button type="primary" htmlType="submit" loading={savingMed}>Save Medication</Button>
                </Flex>
              </form>
            </Card>
          )}
          {meds.length === 0 && !showMedForm && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No medications recorded.
            </Typography.Text>
          )}
          {meds.map((m) => {
            const medReminders = reminders.filter((r) => r.medicationId === m.id);
            return (
              <Card key={m.id}>
                <Flex justify="space-between" align="flex-start" gap={8}>
                  <Flex vertical gap={4}>
                    <Typography.Text strong style={{ fontSize: 14 }}>{m.name}</Typography.Text>
                    <Flex gap={4} wrap="wrap">
                      {m.dosage && <Tag>{m.dosage}</Tag>}
                      {m.frequency && <Tag>{m.frequency}</Tag>}
                    </Flex>
                  </Flex>
                  <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteMed(m.id)} />
                </Flex>
                {medReminders.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Flex vertical gap={8}>
                      {medReminders.map((r) => (
                        <Flex key={r.id} align="center" gap={8}>
                          <BellOutlined style={{ color: '#94a3b8' }} />
                          <Typography.Text type="secondary" style={{ flex: 1 }}>{r.reminderTime}</Typography.Text>
                          <Switch size="small" checked={r.enabled} onChange={() => toggleReminder(r.id)} />
                          <Button type="text" danger size="small" icon={<CloseOutlined />} onClick={() => deleteReminder(r.id)} />
                        </Flex>
                      ))}
                    </Flex>
                  </>
                )}
                <Divider style={{ margin: '12px 0' }} />
                <Flex align="center" gap={8}>
                  <Input type="time" style={{ width: 128 }}
                    value={reminderTime[m.id] ?? ''}
                    onChange={(e) => setReminderTime((p) => ({ ...p, [m.id]: e.target.value }))} />
                  <Button disabled={savingReminder === m.id || !reminderTime[m.id]} onClick={() => saveReminder(m.id)}>
                    {savingReminder === m.id ? '…' : '+ Reminder'}
                  </Button>
                </Flex>
              </Card>
            );
          })}
        </Flex>
      ),
    },
    {
      key: 'recommendations',
      label: <Flex align="center" gap={6}><FileTextOutlined /><span>Recs</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button icon={showRecForm ? <CloseOutlined /> : <PlusOutlined />} onClick={() => setShowRecForm((s) => !s)}>
              {showRecForm ? 'Cancel' : 'Add'}
            </Button>
          </Flex>
          {showRecForm && (
            <Card>
              <form onSubmit={saveRec}>
                <Flex vertical gap={12}>
                  <Input placeholder="Title *" required value={recForm.title}
                    onChange={(e) => setRecForm((p) => ({ ...p, title: e.target.value }))} />
                  <Input.TextArea placeholder="Description (optional)" rows={3}
                    value={recForm.description ?? ''}
                    onChange={(e) => setRecForm((p) => ({ ...p, description: e.target.value }))} />
                  <Input type="date" value={recForm.followUpDate ?? ''}
                    onChange={(e) => setRecForm((p) => ({ ...p, followUpDate: e.target.value }))} />
                  <Button type="primary" htmlType="submit" loading={savingRec}>Save Recommendation</Button>
                </Flex>
              </form>
            </Card>
          )}
          {recs.length === 0 && !showRecForm && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No recommendations recorded.
            </Typography.Text>
          )}
          {recs.map((r) => (
            <Card key={r.id}>
              <Flex justify="space-between" align="flex-start" gap={8}>
                <Flex vertical gap={4}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{r.title}</Typography.Text>
                  {r.followUpDate && <Tag>Follow up: {r.followUpDate}</Tag>}
                  {r.description && <Typography.Text type="secondary">{r.description}</Typography.Text>}
                </Flex>
                <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteRec(r.id)} />
              </Flex>
            </Card>
          ))}
        </Flex>
      ),
    },
    {
      key: 'attachments',
      label: <Flex align="center" gap={6}><PaperClipOutlined /><span>Files</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button icon={<PaperClipOutlined />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
          </Flex>
          {attachments.length === 0 && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No attachments.
            </Typography.Text>
          )}
          {attachments.map((a) => (
            <Card key={a.id}>
              <Flex align="center" gap={12}>
                <FileOutlined style={{ fontSize: 20, color: '#94a3b8', flexShrink: 0 }} />
                <Typography.Link style={{ flex: 1 }} ellipsis onClick={() => openAttachment(a.id)}>
                  {a.filename}
                </Typography.Link>
                <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                  {formatBytes(a.sizeBytes)}
                </Typography.Text>
                <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteAttachment(a.id)} />
              </Flex>
            </Card>
          ))}
        </Flex>
      ),
    },
    {
      key: 'reminders',
      label: <Flex align="center" gap={6}><BellOutlined /><span>Alerts</span></Flex>,
      children: (
        <Flex vertical gap={12}>
          {reminders.length === 0 ? (
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
              No reminders. Add them from the Medications tab.
            </Typography.Text>
          ) : (
            reminders.map((r) => (
              <Card key={r.id}>
                <Flex align="center" gap={12}>
                  <BellOutlined style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong ellipsis>{r.medicationName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.reminderTime}</Typography.Text>
                  </Flex>
                  <Switch size="small" checked={r.enabled} onChange={() => toggleReminder(r.id)} />
                  <Button type="text" danger icon={<CloseOutlined />} onClick={() => deleteReminder(r.id)} />
                </Flex>
              </Card>
            ))
          )}
        </Flex>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        title="Visit Detail"
        backHref="/"
        actions={
          <Flex gap={8}>
            <Button onClick={() => navigate(`/visits/${id}/edit`)}>Edit</Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDeleteVisit}>Delete</Button>
          </Flex>
        }
      />
      <main style={{ width: '100%', maxWidth: 672, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {pageError && <Alert type="error" message={pageError} showIcon />}

        {visit && (
          <Card>
            <Flex vertical gap={8}>
              <Flex align="center" gap={8} wrap="wrap">
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>{visit.visitDate}</Typography.Text>
                {visit.specialty && <Tag bordered={false}>{visit.specialty}</Tag>}
              </Flex>
              <Typography.Title level={4} style={{ margin: 0 }}>{visit.doctorName}</Typography.Title>
              {visit.clinic && (
                <Flex align="center" gap={6}>
                  <EnvironmentOutlined style={{ color: '#94a3b8' }} />
                  <Typography.Text type="secondary">{visit.clinic}</Typography.Text>
                </Flex>
              )}
              {(visit.chiefComplaint || visit.diagnosis) && <Divider style={{ margin: '8px 0' }} />}
              {visit.chiefComplaint && (
                <Typography.Text>
                  <Typography.Text type="secondary">Complaint: </Typography.Text>
                  {visit.chiefComplaint}
                </Typography.Text>
              )}
              {visit.diagnosis && (
                <Typography.Text>
                  <Typography.Text type="secondary">Diagnosis: </Typography.Text>
                  {visit.diagnosis}
                </Typography.Text>
              )}
              {visit.notes && (
                <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                  {visit.notes}
                </Typography.Text>
              )}
            </Flex>
          </Card>
        )}

        <Tabs defaultActiveKey="medications" items={tabItems} />
      </main>
    </div>
  );
}
