# Reminders: Timezone Support + Service Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make medication reminders work correctly by (1) adding a service worker so push notifications are actually received in the browser, and (2) storing per-user timezone so reminders fire at the right local time.

**Architecture:** Reminder times are stored as `LocalTime` (HH:MM, no zone). The scheduler currently compares against UTC always. Fix: store an IANA timezone string per user (defaulting to `'UTC'`), sync it from the browser on login, and use it in the scheduler to convert UTC → user-local before comparing. The service worker lives at `frontend/public/sw.js` (served at `/sw.js`) and handles `push` events to show browser notifications.

**Tech Stack:** Spring Boot (Java 17), Flyway migrations, React + TypeScript, Vite, Web Push API

---

### Task 1: DB migration — add timezone to users

**Files:**
- Create: `src/main/resources/db/migration/V9__add_user_timezone.sql`

- [ ] **Step 1: Create migration**

```sql
ALTER TABLE users ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC';
```

- [ ] **Step 2: Verify file exists**

```bash
cat src/main/resources/db/migration/V9__add_user_timezone.sql
```
Expected:
```
ALTER TABLE users ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC';
```

- [ ] **Step 3: Commit**

```bash
git add src/main/resources/db/migration/V9__add_user_timezone.sql
git commit -m "feat: migration V9 — add timezone column to users"
```

---

### Task 2: Backend — User entity, response, service, controller

**Files:**
- Modify: `src/main/java/com/medhistory/user/User.java`
- Modify: `src/main/java/com/medhistory/user/UserResponse.java`
- Modify: `src/main/java/com/medhistory/user/UserService.java`
- Modify: `src/main/java/com/medhistory/user/UserController.java`

- [ ] **Step 1: Add timezone field to User entity**

In `User.java`, add after the `profilePicture` field and its getter/setter:

```java
@Column(name = "timezone", nullable = false)
private String timezone = "UTC";

public String getTimezone() { return timezone; }
public void setTimezone(String timezone) { this.timezone = timezone; }
```

- [ ] **Step 2: Update UserResponse to include timezone**

Replace the entire `UserResponse.java` with:

```java
package com.medhistory.user;

import java.util.UUID;

public record UserResponse(UUID id, String email, String name, String profilePicture, String timezone) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(), user.getEmail(), user.getName(),
            user.getProfilePicture(), user.getTimezone()
        );
    }
}
```

- [ ] **Step 3: Add updateTimezone to UserService**

In `UserService.java`, add this method after `getById`:

```java
public void updateTimezone(UUID userId, String timezone) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    user.setTimezone(timezone);
    userRepository.save(user);
}
```

- [ ] **Step 4: Add PATCH endpoint to UserController**

Replace the entire `UserController.java` with:

```java
package com.medhistory.user;

import com.medhistory.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        return SecurityUtils.getCurrentUserId()
                .map(userService::getById)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }

    @PatchMapping("/me/timezone")
    public ResponseEntity<Void> updateTimezone(@RequestBody Map<String, String> body) {
        String timezone = body.get("timezone");
        if (timezone == null || timezone.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return SecurityUtils.getCurrentUserId()
                .map(id -> { userService.updateTimezone(id, timezone); return id; })
                .map(id -> ResponseEntity.<Void>noContent().build())
                .orElse(ResponseEntity.status(401).build());
    }
}
```

- [ ] **Step 5: Compile check**

```bash
mvn compile -q
```
Expected: BUILD SUCCESS (no output)

- [ ] **Step 6: Run tests**

```bash
mvn test -q 2>&1 | tail -5
```
Expected: `BUILD SUCCESS`

- [ ] **Step 7: Commit**

```bash
git add src/main/java/com/medhistory/user/
git commit -m "feat: add timezone field to User and PATCH /api/users/me/timezone endpoint"
```

---

### Task 3: Backend — fix ReminderScheduler to use per-user timezone

**Files:**
- Modify: `src/main/java/com/medhistory/reminder/MedicationReminderRepository.java`
- Modify: `src/main/java/com/medhistory/reminder/ReminderScheduler.java`

- [ ] **Step 1: Add findAllActive to repository**

In `MedicationReminderRepository.java`, add this method:

```java
@Query("SELECT r FROM MedicationReminder r JOIN FETCH r.user WHERE r.active = true")
List<MedicationReminder> findAllActive();
```

The full file should look like:

```java
package com.medhistory.reminder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MedicationReminderRepository extends JpaRepository<MedicationReminder, UUID> {

    List<MedicationReminder> findByMedicationId(UUID medicationId);

    List<MedicationReminder> findByUserId(UUID userId);

    @Query("SELECT r FROM MedicationReminder r JOIN FETCH r.user WHERE r.active = true")
    List<MedicationReminder> findAllActive();

    @Query("""
            SELECT r FROM MedicationReminder r
            WHERE r.active = true
              AND HOUR(r.reminderTime) = :hour
              AND MINUTE(r.reminderTime) = :minute
            """)
    List<MedicationReminder> findDueReminders(@Param("hour") int hour, @Param("minute") int minute);
}
```

- [ ] **Step 2: Rewrite ReminderScheduler to use per-user timezone**

Replace the entire `ReminderScheduler.java` with:

```java
package com.medhistory.reminder;

import com.medhistory.push.PushService;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final MedicationReminderRepository reminderRepository;
    private final PushService pushService;
    private final MeterRegistry meterRegistry;

    public ReminderScheduler(MedicationReminderRepository reminderRepository,
                             PushService pushService,
                             MeterRegistry meterRegistry) {
        this.reminderRepository = reminderRepository;
        this.pushService = pushService;
        this.meterRegistry = meterRegistry;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void fireReminders() {
        Instant now = Instant.now();
        List<MedicationReminder> active = reminderRepository.findAllActive();

        for (MedicationReminder reminder : active) {
            try {
                String tz = reminder.getUser().getTimezone();
                ZoneId zone = resolveZone(tz);
                LocalTime localNow = LocalTime.ofInstant(now, zone);
                LocalTime rt = reminder.getReminderTime();

                if (localNow.getHour() == rt.getHour() && localNow.getMinute() == rt.getMinute()) {
                    String medName = reminder.getMedication().getName();
                    pushService.sendToUser(reminder.getUser().getId(),
                            "Medication Reminder",
                            "Time to take: " + medName);
                    reminder.setLastSentAt(now);
                    reminderRepository.save(reminder);
                    meterRegistry.counter("medhistory.reminders.sent").increment();
                }
            } catch (Exception e) {
                log.error("Failed to process reminder id={}: {}", reminder.getId(), e.getMessage());
            }
        }
    }

    private ZoneId resolveZone(String tz) {
        if (tz == null || tz.isBlank()) return ZoneId.of("UTC");
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            log.warn("Invalid timezone '{}', falling back to UTC", tz);
            return ZoneId.of("UTC");
        }
    }
}
```

- [ ] **Step 3: Compile and test**

```bash
mvn test -q 2>&1 | tail -5
```
Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
git add src/main/java/com/medhistory/reminder/
git commit -m "feat: reminder scheduler uses per-user IANA timezone instead of hardcoded UTC"
```

---

### Task 4: Frontend — service worker

**Files:**
- Create: `frontend/public/sw.js`

- [ ] **Step 1: Create the public directory and service worker**

```bash
mkdir -p frontend/public
```

Create `frontend/public/sw.js`:

```js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Medication Reminder';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'medication-reminder',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
```

- [ ] **Step 2: Verify the file is at the right path**

```bash
cat frontend/public/sw.js | head -5
```
Expected:
```
self.addEventListener('push', (event) => {
```

- [ ] **Step 3: Commit**

```bash
git add frontend/public/sw.js
git commit -m "feat: add service worker for web push notifications"
```

---

### Task 5: Frontend — API + AuthContext (SW registration, push subscribe, timezone sync)

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/AuthContext.tsx`

- [ ] **Step 1: Update User interface and add API methods in api.ts**

In `frontend/src/api.ts`, update the `User` interface to include `timezone`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  timezone: string;
}
```

Add `updateTimezone` to the `api` object inside the push section (after `unsubscribe`):

```typescript
  users: {
    updateTimezone: (timezone: string) =>
      request<void>('/api/users/me/timezone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      }),
  },
```

- [ ] **Step 2: Rewrite AuthContext.tsx to register SW, subscribe to push, and sync timezone**

Replace `frontend/src/AuthContext.tsx` with:

```typescript
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
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
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
        applicationServerKey: urlBase64ToUint8Array(publicKey),
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (no errors)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api.ts frontend/src/AuthContext.tsx
git commit -m "feat: register service worker, subscribe to push, sync browser timezone on login"
```

---

### Task 6: Create PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/reminders-timezone-push
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "feat: reminder timezone support + service worker for push notifications" \
  --body "$(cat <<'EOF'
## Summary

- **Service worker** (`frontend/public/sw.js`): handles `push` events to show browser notifications and `notificationclick` to focus/open the app. Without this, the browser could not receive push events even when the backend sent them.
- **Timezone support**: stores an IANA timezone string per user (DB migration V9, default \`UTC\`). Browser timezone is detected via \`Intl.DateTimeFormat().resolvedOptions().timeZone\` and synced to the backend on login via \`PATCH /api/users/me/timezone\`.
- **Scheduler fix**: \`ReminderScheduler\` now converts the current UTC instant to each user's local timezone before comparing against the stored reminder time, so reminders fire at the correct local time.
- **Push registration**: \`AuthContext\` registers the SW, requests notification permission, and subscribes the browser to Web Push on login.

## Platform support (with service worker in place)

| Platform | Status |
|---|---|
| Chrome/Firefox Mac & Windows | ✅ |
| Android Chrome | ✅ |
| Safari macOS Ventura+ | ✅ |
| iOS Safari (PWA via Add to Home Screen) | ✅ |
| iOS Chrome/Firefox | ❌ (Apple restriction, uses Safari engine) |

## Test plan

- [ ] Run `mvn test` — all 28 tests pass
- [ ] Log in — browser prompts for notification permission
- [ ] Set a reminder 1-2 minutes in future in your local time
- [ ] Confirm notification arrives at the right time
- [ ] Check `PATCH /api/users/me/timezone` is called with correct IANA zone on login
- [ ] Verify `GET /api/users/me` now returns `timezone` field
EOF
)"
```

- [ ] **Step 3: Report PR URL**

Run:
```bash
gh pr view --json url -q .url
```
And report the URL.
