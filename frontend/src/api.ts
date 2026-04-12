export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
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

  visits: {
    list: () =>
      request<{ content: Visit[] }>('/api/visits').then((p) => p.content),
    create: (body: VisitRequest) =>
      request<Visit>('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/visits/${id}`, { method: 'DELETE' }),
  },
};
