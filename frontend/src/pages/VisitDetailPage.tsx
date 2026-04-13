import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin, Pill, ClipboardList, Paperclip, Bell,
  Plus, X, FileText, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  type Visit, type Medication, type MedicationRequest,
  type Recommendation, type RecommendationRequest,
  type Attachment, type MedicationReminder,
} from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/PageHeader';

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
      setVisit(v);
      setMeds(m);
      setRecs(r);
      setAttachments(a);
      setReminders(rem);
      setLoading(false);
    }).catch((e) => { setPageError(e.message); setLoading(false); });
  }, [id]);

  const handleDeleteVisit = async () => {
    if (!id) return;
    await api.visits.delete(id).catch((e) => setPageError(e.message));
    toast.success('Visit deleted');
    navigate('/');
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
      toast.success('Medication added');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingMed(false);
    }
  };

  const deleteMed = async (medId: string) => {
    if (!id) return;
    await api.medications.delete(id, medId).catch((e) => setPageError(e.message));
    setMeds((prev) => prev.filter((m) => m.id !== medId));
    setReminders((prev) => prev.filter((r) => r.medicationId !== medId));
    toast.success('Medication removed');
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
      toast.success('Recommendation added');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingRec(false);
    }
  };

  const deleteRec = async (recId: string) => {
    if (!id) return;
    await api.recommendations.delete(id, recId).catch((e) => setPageError(e.message));
    setRecs((prev) => prev.filter((r) => r.id !== recId));
    toast.success('Recommendation removed');
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const a = await api.attachments.upload(id, file);
      setAttachments((prev) => [...prev, a]);
      toast.success('File uploaded');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Upload failed');
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
      setPageError(e instanceof Error ? e.message : 'Failed to open');
    }
  };

  const deleteAttachment = async (attachId: string) => {
    if (!id) return;
    await api.attachments.delete(id, attachId).catch((e) => setPageError(e.message));
    setAttachments((prev) => prev.filter((a) => a.id !== attachId));
    toast.success('Attachment removed');
  };

  const saveReminder = async (medId: string) => {
    const time = reminderTime[medId];
    if (!time) return;
    setSavingReminder(medId);
    try {
      const r = await api.reminders.create({ medicationId: medId, reminderTime: time });
      setReminders((prev) => [...prev, r]);
      setReminderTime((prev) => ({ ...prev, [medId]: '' }));
      toast.success('Reminder set');
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingReminder(null);
    }
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
    toast.success('Reminder removed');
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <PageHeader title="Visit Detail" backHref="/" />
        <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <PageHeader
        title="Visit Detail"
        backHref="/"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/visits/${id}/edit`)}
            >
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this visit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the visit and all its medications,
                    recommendations, and attachments. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteVisit}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-5">
        {pageError && (
          <Alert variant="destructive">
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        )}

        {visit && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{visit.visitDate}</span>
                {visit.specialty && <Badge variant="outline">{visit.specialty}</Badge>}
              </div>
              <h2 className="text-xl font-bold text-foreground">{visit.doctorName}</h2>
              {visit.clinic && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {visit.clinic}
                </p>
              )}
              {(visit.chiefComplaint || visit.diagnosis) && <Separator />}
              {visit.chiefComplaint && (
                <p className="text-sm text-foreground">
                  <span className="font-medium text-muted-foreground">Complaint: </span>
                  {visit.chiefComplaint}
                </p>
              )}
              {visit.diagnosis && (
                <p className="text-sm text-foreground">
                  <span className="font-medium text-muted-foreground">Diagnosis: </span>
                  {visit.diagnosis}
                </p>
              )}
              {visit.notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="medications">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="medications" className="gap-1.5">
              <Pill className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Medications</span>
              <span className="sm:hidden">Meds</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Recommendations</span>
              <span className="sm:hidden">Recs</span>
            </TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Attachments</span>
              <span className="sm:hidden">Files</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reminders</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
          </TabsList>

          {/* Medications */}
          <TabsContent value="medications" className="mt-3 space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowMedForm((s) => !s)}>
                {showMedForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {showMedForm ? 'Cancel' : 'Add'}
              </Button>
            </div>
            {showMedForm && (
              <Card>
                <CardContent className="p-4">
                  <form onSubmit={saveMed} className="space-y-3">
                    <Input placeholder="Medication name *" required value={medForm.name}
                      onChange={(e) => setMedForm((p) => ({ ...p, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Dosage (e.g. 10mg)" value={medForm.dosage ?? ''}
                        onChange={(e) => setMedForm((p) => ({ ...p, dosage: e.target.value }))} />
                      <Input placeholder="Frequency (e.g. once daily)" value={medForm.frequency ?? ''}
                        onChange={(e) => setMedForm((p) => ({ ...p, frequency: e.target.value }))} />
                    </div>
                    <Button type="submit" size="sm" disabled={savingMed}>
                      {savingMed ? 'Saving…' : 'Save Medication'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            {meds.length === 0 && !showMedForm && (
              <p className="text-sm text-muted-foreground text-center py-6">No medications recorded.</p>
            )}
            {meds.map((m) => {
              const medReminders = reminders.filter((r) => r.medicationId === m.id);
              return (
                <Card key={m.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">{m.name}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {m.dosage && <Badge variant="secondary" className="text-xs">{m.dosage}</Badge>}
                          {m.frequency && <Badge variant="secondary" className="text-xs">{m.frequency}</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => deleteMed(m.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {medReminders.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-border">
                        {medReminders.map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-sm">
                            <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground flex-1">{r.reminderTime}</span>
                            <Switch checked={r.enabled} onCheckedChange={() => toggleReminder(r.id)} />
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteReminder(r.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1 border-t border-border">
                      <Input type="time" className="h-8 w-32"
                        value={reminderTime[m.id] ?? ''}
                        onChange={(e) => setReminderTime((p) => ({ ...p, [m.id]: e.target.value }))} />
                      <Button variant="outline" size="sm"
                        disabled={savingReminder === m.id || !reminderTime[m.id]}
                        onClick={() => saveReminder(m.id)}>
                        {savingReminder === m.id ? '…' : '+ Reminder'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="mt-3 space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowRecForm((s) => !s)}>
                {showRecForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {showRecForm ? 'Cancel' : 'Add'}
              </Button>
            </div>
            {showRecForm && (
              <Card>
                <CardContent className="p-4">
                  <form onSubmit={saveRec} className="space-y-3">
                    <Input placeholder="Title *" required value={recForm.title}
                      onChange={(e) => setRecForm((p) => ({ ...p, title: e.target.value }))} />
                    <Textarea placeholder="Description (optional)" rows={3}
                      value={recForm.description ?? ''}
                      onChange={(e) => setRecForm((p) => ({ ...p, description: e.target.value }))} />
                    <Input type="date" value={recForm.followUpDate ?? ''}
                      onChange={(e) => setRecForm((p) => ({ ...p, followUpDate: e.target.value }))} />
                    <Button type="submit" size="sm" disabled={savingRec}>
                      {savingRec ? 'Saving…' : 'Save Recommendation'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            {recs.length === 0 && !showRecForm && (
              <p className="text-sm text-muted-foreground text-center py-6">No recommendations recorded.</p>
            )}
            {recs.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">{r.title}</p>
                      {r.followUpDate && (
                        <Badge variant="outline" className="text-xs">Follow up: {r.followUpDate}</Badge>
                      )}
                      {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteRec(r.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Attachments */}
          <TabsContent value="attachments" className="mt-3 space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled={uploading}
                onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-1" />
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
              <input ref={fileRef} type="file" className="hidden" onChange={uploadFile} />
            </div>
            {attachments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No attachments.</p>
            )}
            {attachments.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <button className="flex-1 text-left text-sm font-medium text-primary hover:underline truncate"
                      onClick={() => openAttachment(a.id)}>
                      {a.filename}
                    </button>
                    <span className="text-xs text-muted-foreground shrink-0">{formatBytes(a.sizeBytes)}</span>
                    <Button variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteAttachment(a.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Reminders */}
          <TabsContent value="reminders" className="mt-3 space-y-3">
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No reminders. Add them from the Medications tab.
              </p>
            ) : (
              reminders.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.medicationName}</p>
                        <p className="text-xs text-muted-foreground">{r.reminderTime}</p>
                      </div>
                      <Switch checked={r.enabled} onCheckedChange={() => toggleReminder(r.id)} />
                      <Button variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => deleteReminder(r.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
