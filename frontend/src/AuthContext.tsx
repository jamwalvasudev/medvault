import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await api.push.vapidKey();

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    await api.push.subscribe({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
  } catch (err) {
    console.warn('Push subscription failed:', err);
  }
}

async function syncTimezone(user: User): Promise<void> {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (user.timezone !== browserTz) {
    try {
      await api.users.updateTimezone(browserTz);
    } catch (err) {
      console.warn('Failed to sync timezone:', err);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    api
      .me()
      .then(async (user) => {
        setState({ user, loading: false });

        // Register service worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
              console.log('SW registered:', reg.scope);
              const permission = Notification.permission;
              if (permission === 'granted') {
                registerPushSubscription();
              } else if (permission === 'default') {
                Notification.requestPermission().then((p) => {
                  if (p === 'granted') registerPushSubscription();
                });
              }
            })
            .catch((err) => console.warn('SW registration failed:', err));
        }

        // Sync browser timezone to backend
        await syncTimezone(user);
      })
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
