import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Card, Flex, Input, Select, Typography } from 'antd';
import { api, type VisitRequest } from '@/api';
import PageHeader from '@/components/PageHeader';

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
  const { message } = App.useApp();
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

  useEffect(() => {
    api.specialties.list()
      .then(setSpecialties)
      .catch(() => setSpecialtyFailed(true));
  }, []);

  useEffect(() => {
    if (specialtyInitializedRef.current || specialties.length === 0) return;
    if (isEdit && !form.specialty) return;
    const match = specialties.find((s) => s.name === form.specialty);
    setSelectValue(match ? (form.specialty ?? '') : (form.specialty ? '__other__' : ''));
    if (form.specialty && !match) setCustomSpecialty(form.specialty);
    specialtyInitializedRef.current = true;
  }, [specialties, form.specialty, isEdit]);

  const field =
    (key: keyof VisitRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
        message.success('Visit updated');
        navigate(`/visits/${id}`);
      } else {
        const v = await api.visits.create(submitData);
        message.success('Visit saved');
        navigate(`/visits/${v.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const specialtyOptions = [
    ...specialties.map((s) => ({ value: s.name, label: s.name })),
    { value: '__other__', label: 'Other…' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <PageHeader
        title={isEdit ? 'Edit Visit' : 'New Visit'}
        backHref={isEdit ? `/visits/${id}` : '/'}
      />
      <main style={{ width: '100%', maxWidth: 672, margin: '0 auto', padding: '24px 16px' }}>
        <Card>
          <form onSubmit={handleSubmit}>
            <Flex vertical gap={20}>
              {error && <Alert type="error" message={error} showIcon />}

              <Flex gap={16} wrap="wrap">
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Date *</Typography.Text>
                  <Input type="date" required value={form.visitDate} onChange={field('visitDate')} />
                </Flex>
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Doctor *</Typography.Text>
                  <Input placeholder="Dr. Smith" required value={form.doctorName} onChange={field('doctorName')} />
                </Flex>
              </Flex>

              <Flex gap={16} wrap="wrap">
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Specialty</Typography.Text>
                  {specialtyFailed ? (
                    <Input placeholder="GP, Cardiology…" value={form.specialty ?? ''} onChange={field('specialty')} />
                  ) : (
                    <Flex vertical gap={8}>
                      <Select
                        placeholder="— select specialty —"
                        value={selectValue || undefined}
                        onChange={(val) => {
                          setSelectValue(val);
                          if (val !== '__other__') setCustomSpecialty('');
                        }}
                        options={specialtyOptions}
                        style={{ width: '100%' }}
                      />
                      {selectValue === '__other__' && (
                        <Input
                          placeholder="Enter specialty"
                          value={customSpecialty}
                          onChange={(e) => setCustomSpecialty(e.target.value)}
                        />
                      )}
                    </Flex>
                  )}
                </Flex>
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 200 }}>
                  <Typography.Text strong>Clinic / Hospital</Typography.Text>
                  <Input placeholder="City General Hospital" value={form.clinic ?? ''} onChange={field('clinic')} />
                </Flex>
              </Flex>

              <Flex vertical gap={6}>
                <Typography.Text strong>Chief Complaint</Typography.Text>
                <Input placeholder="Why you visited" value={form.chiefComplaint ?? ''} onChange={field('chiefComplaint')} />
              </Flex>

              <Flex vertical gap={6}>
                <Typography.Text strong>Diagnosis</Typography.Text>
                <Input placeholder="Diagnosis / findings" value={form.diagnosis ?? ''} onChange={field('diagnosis')} />
              </Flex>

              <Flex vertical gap={6}>
                <Typography.Text strong>Notes</Typography.Text>
                <Input.TextArea placeholder="Additional notes…" rows={4} value={form.notes ?? ''} onChange={field('notes')} />
              </Flex>

              <Flex justify="flex-end" gap={12}>
                <Button onClick={() => navigate(isEdit ? `/visits/${id}` : '/')}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Save Visit
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      </main>
    </div>
  );
}
