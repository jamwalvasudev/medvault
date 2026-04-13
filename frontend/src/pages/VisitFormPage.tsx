import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api, type VisitRequest } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        toast.success('Visit updated');
        navigate(`/visits/${id}`);
      } else {
        const v = await api.visits.create(submitData);
        toast.success('Visit saved');
        navigate(`/visits/${v.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <PageHeader
        title={isEdit ? 'Edit Visit' : 'New Visit'}
        backHref={isEdit ? `/visits/${id}` : '/'}
      />
      <main className="w-full max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Date *</label>
                  <Input type="date" required value={form.visitDate} onChange={field('visitDate')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Doctor *</label>
                  <Input placeholder="Dr. Smith" required value={form.doctorName} onChange={field('doctorName')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Specialty</label>
                  {specialtyFailed ? (
                    <Input placeholder="GP, Cardiology…" value={form.specialty ?? ''} onChange={field('specialty')} />
                  ) : (
                    <>
                      <Select value={selectValue} onValueChange={(val) => {
                        setSelectValue(val);
                        if (val !== '__other__') setCustomSpecialty('');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="— select specialty —" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialties.map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                          <SelectItem value="__other__">Other…</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectValue === '__other__' && (
                        <Input placeholder="Enter specialty" className="mt-2"
                          value={customSpecialty}
                          onChange={(e) => setCustomSpecialty(e.target.value)} />
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Clinic / Hospital</label>
                  <Input placeholder="City General Hospital" value={form.clinic ?? ''} onChange={field('clinic')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Chief Complaint</label>
                <Input placeholder="Why you visited" value={form.chiefComplaint ?? ''} onChange={field('chiefComplaint')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Diagnosis</label>
                <Input placeholder="Diagnosis / findings" value={form.diagnosis ?? ''} onChange={field('diagnosis')} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Textarea placeholder="Additional notes…" rows={4} value={form.notes ?? ''} onChange={field('notes')} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost"
                  onClick={() => navigate(isEdit ? `/visits/${id}` : '/')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Visit'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
