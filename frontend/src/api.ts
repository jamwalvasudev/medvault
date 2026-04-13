export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  timezone: string;
}

export interface Visit {
  id: string;
  visitDate: string;
  doctorName: string;
  specialty?: string;
  clinic?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
}

export interface VisitRequest {
  visitDate: string;
  doctorName: string;
  specialty?: string;
  clinic?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface MedicationRequest {
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  followUpDate?: string;
}

export interface RecommendationRequest {
  title: string;
  description?: string;
  followUpDate?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface MedicationReminder {
  id: string;
  medicationId: string;
  medicationName: string;
  reminderTime: string;
  enabled: boolean;
}

export interface ReminderRequest {
  medicationId: string;
  reminderTime: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init });
  if (res.status === 401) throw new Error('unauthenticated');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  me: () => request<User>('/api/users/me'),

  users: {
    updateTimezone: (timezone: string) =>
      request<void>('/api/users/me/timezone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      }),
  },

  visits: {
    list: () =>
      request<{ content: Visit[] }>('/api/visits').then((p) => p.content),
    get: (id: string) => request<Visit>(`/api/visits/${id}`),
    create: (body: VisitRequest) =>
      request<Visit>('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    update: (id: string, body: VisitRequest) =>
      request<Visit>(`/api/visits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/visits/${id}`, { method: 'DELETE' }),
    search: (q: string) =>
      request<Visit[]>(`/api/visits/search?q=${encodeURIComponent(q)}`),
  },

  medications: {
    list: (visitId: string) =>
      request<Medication[]>(`/api/visits/${visitId}/medications`),
    create: (visitId: string, body: MedicationRequest) =>
      request<Medication>(`/api/visits/${visitId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    update: (visitId: string, medId: string, body: MedicationRequest) =>
      request<Medication>(`/api/visits/${visitId}/medications/${medId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    delete: (visitId: string, medId: string) =>
      request<void>(`/api/visits/${visitId}/medications/${medId}`, { method: 'DELETE' }),
  },

  recommendations: {
    list: (visitId: string) =>
      request<Recommendation[]>(`/api/visits/${visitId}/recommendations`),
    create: (visitId: string, body: RecommendationRequest) =>
      request<Recommendation>(`/api/visits/${visitId}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    delete: (visitId: string, recId: string) =>
      request<void>(`/api/visits/${visitId}/recommendations/${recId}`, { method: 'DELETE' }),
  },

  attachments: {
    list: (visitId: string) =>
      request<Attachment[]>(`/api/visits/${visitId}/attachments`),
    upload: (visitId: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return request<Attachment>(`/api/visits/${visitId}/attachments`, {
        method: 'POST',
        body: fd,
      });
    },
    presign: (visitId: string, attachId: string) =>
      request<{ url: string }>(`/api/visits/${visitId}/attachments/${attachId}/presign`),
    delete: (visitId: string, attachId: string) =>
      request<void>(`/api/visits/${visitId}/attachments/${attachId}`, { method: 'DELETE' }),
  },

  reminders: {
    list: () => request<MedicationReminder[]>('/api/reminders'),
    create: (body: ReminderRequest) =>
      request<MedicationReminder>('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    toggle: (id: string) =>
      request<MedicationReminder>(`/api/reminders/${id}/toggle`, { method: 'POST' }),
    delete: (id: string) =>
      request<void>(`/api/reminders/${id}`, { method: 'DELETE' }),
  },

  push: {
    vapidKey: () => request<{ publicKey: string }>('/api/push/public-key'),
    subscribe: (body: PushSubscriptionRequest) =>
      request<void>('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    unsubscribe: (endpoint: string) =>
      request<void>('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }),
  },

  specialties: {
    list: () => request<{ id: number; name: string }[]>('/api/specialties'),
  },
};
