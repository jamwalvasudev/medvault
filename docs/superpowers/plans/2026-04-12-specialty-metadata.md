# Specialty Metadata Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text specialty input on the visit form with a seeded dropdown, with an "Other…" escape hatch for custom values that are private to the entering user.

**Architecture:** A new `specialties` table is seeded once via Flyway migration and exposed read-only via `GET /api/specialties`. The `visits.specialty` column stays a plain `VARCHAR` — no FK — so custom strings can be stored alongside predefined values. The frontend dropdown sets a `selectValue` state; on submit the effective specialty is derived (`__other__` sentinel → custom text, anything else → the selected name).

**Tech Stack:** Java 21, Spring Boot 3, JPA/Hibernate, Flyway, React 18, TypeScript, Vite

---

## File Map

| Action | Path |
|---|---|
| Create | `src/main/resources/db/migration/V6__add_specialties.sql` |
| Create | `src/main/java/com/medhistory/specialty/Specialty.java` |
| Create | `src/main/java/com/medhistory/specialty/SpecialtyRepository.java` |
| Create | `src/main/java/com/medhistory/specialty/SpecialtyResponse.java` |
| Create | `src/main/java/com/medhistory/specialty/SpecialtyController.java` |
| Create | `src/test/java/com/medhistory/specialty/SpecialtyControllerTest.java` |
| Modify | `src/main/java/com/medhistory/config/SecurityConfig.java` |
| Modify | `frontend/src/api.ts` |
| Modify | `frontend/src/pages/VisitFormPage.tsx` |

---

### Task 1: Flyway migration — create and seed `specialties` table

**Files:**
- Create: `src/main/resources/db/migration/V6__add_specialties.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- src/main/resources/db/migration/V6__add_specialties.sql
CREATE TABLE specialties (
    id         SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO specialties (name, sort_order) VALUES
  ('General Practice',     1),
  ('Internal Medicine',    2),
  ('Cardiology',           3),
  ('Dermatology',          4),
  ('Endocrinology',        5),
  ('Gastroenterology',     6),
  ('Geriatrics',           7),
  ('Gynecology',           8),
  ('Hematology',           9),
  ('Infectious Disease',  10),
  ('Nephrology',          11),
  ('Neurology',           12),
  ('Obstetrics',          13),
  ('Oncology',            14),
  ('Ophthalmology',       15),
  ('Orthopedics',         16),
  ('ENT',                 17),
  ('Pediatrics',          18),
  ('Psychiatry',          19),
  ('Pulmonology',         20),
  ('Rheumatology',        21),
  ('Sports Medicine',     22),
  ('Surgery (General)',   23),
  ('Urology',             24),
  ('Vascular Surgery',    25),
  ('Dentistry',           26),
  ('Physiotherapy',       27),
  ('Emergency Medicine',  28),
  ('Palliative Care',     29),
  ('Radiology',           30);
```

- [ ] **Step 2: Start the app and verify the migration runs cleanly**

```bash
set -a; source .env.local; set +a
mvn spring-boot:run -Dspring-boot.run.profiles=local 2>&1 | grep -E "Flyway|V6|ERROR" | head -20
```

Expected output includes:
```
Successfully applied 1 migration to schema "public", now at version v6
```

Stop the app (Ctrl+C) once confirmed.

- [ ] **Step 3: Commit**

```bash
git add src/main/resources/db/migration/V6__add_specialties.sql
git commit -m "feat: add specialties table with 30 seeded values"
```

---

### Task 2: Specialty domain — entity, repository, response

**Files:**
- Create: `src/main/java/com/medhistory/specialty/Specialty.java`
- Create: `src/main/java/com/medhistory/specialty/SpecialtyRepository.java`
- Create: `src/main/java/com/medhistory/specialty/SpecialtyResponse.java`

- [ ] **Step 1: Create the JPA entity**

```java
// src/main/java/com/medhistory/specialty/Specialty.java
package com.medhistory.specialty;

import jakarta.persistence.*;

@Entity
@Table(name = "specialties")
public class Specialty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
```

- [ ] **Step 2: Create the repository**

```java
// src/main/java/com/medhistory/specialty/SpecialtyRepository.java
package com.medhistory.specialty;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpecialtyRepository extends JpaRepository<Specialty, Integer> {
    List<Specialty> findAllByOrderBySortOrderAsc();
}
```

- [ ] **Step 3: Create the response record**

```java
// src/main/java/com/medhistory/specialty/SpecialtyResponse.java
package com.medhistory.specialty;

public record SpecialtyResponse(Integer id, String name) {
    public static SpecialtyResponse from(Specialty s) {
        return new SpecialtyResponse(s.getId(), s.getName());
    }
}
```

- [ ] **Step 4: Verify compilation**

```bash
mvn compile -q
```

Expected: no output (clean compile). Fix any errors before continuing.

---

### Task 3: SpecialtyController + SecurityConfig + test

**Files:**
- Create: `src/main/java/com/medhistory/specialty/SpecialtyController.java`
- Create: `src/test/java/com/medhistory/specialty/SpecialtyControllerTest.java`
- Modify: `src/main/java/com/medhistory/config/SecurityConfig.java`

- [ ] **Step 1: Write the failing test**

```java
// src/test/java/com/medhistory/specialty/SpecialtyControllerTest.java
package com.medhistory.specialty;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpecialtyControllerTest {

    @Mock
    private SpecialtyRepository specialtyRepository;
    private SpecialtyController controller;

    @BeforeEach
    void setUp() {
        controller = new SpecialtyController(specialtyRepository);
    }

    @Test
    void list_returnsSpecialtiesFromRepository() {
        Specialty cardiology = new Specialty();
        cardiology.setId(3);
        cardiology.setName("Cardiology");
        cardiology.setSortOrder(3);

        Specialty dermatology = new Specialty();
        dermatology.setId(4);
        dermatology.setName("Dermatology");
        dermatology.setSortOrder(4);

        when(specialtyRepository.findAllByOrderBySortOrderAsc())
                .thenReturn(List.of(cardiology, dermatology));

        var response = controller.list();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).name()).isEqualTo("Cardiology");
        assertThat(response.getBody().get(1).name()).isEqualTo("Dermatology");
    }
}
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
mvn test -pl . -Dtest=SpecialtyControllerTest -q 2>&1 | tail -10
```

Expected: compilation error — `SpecialtyController` does not exist yet.

- [ ] **Step 3: Create the controller**

```java
// src/main/java/com/medhistory/specialty/SpecialtyController.java
package com.medhistory.specialty;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/specialties")
public class SpecialtyController {

    private final SpecialtyRepository specialtyRepository;

    public SpecialtyController(SpecialtyRepository specialtyRepository) {
        this.specialtyRepository = specialtyRepository;
    }

    @GetMapping
    public ResponseEntity<List<SpecialtyResponse>> list() {
        return ResponseEntity.ok(
                specialtyRepository.findAllByOrderBySortOrderAsc()
                        .stream().map(SpecialtyResponse::from).toList()
        );
    }
}
```

- [ ] **Step 4: Allow unauthenticated access to `/api/specialties` in SecurityConfig**

In `src/main/java/com/medhistory/config/SecurityConfig.java`, add `"/api/specialties"` to the existing `permitAll` list:

```java
// Replace the existing .requestMatchers(...).permitAll() block with:
.requestMatchers(
    "/actuator/health",
    "/actuator/info",
    "/actuator/prometheus",
    "/oauth2/**",
    "/login/**",
    "/error",
    "/api/specialties"
).permitAll()
```

- [ ] **Step 5: Run the test — verify it passes**

```bash
mvn test -pl . -Dtest=SpecialtyControllerTest -q 2>&1 | tail -5
```

Expected:
```
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
```

- [ ] **Step 6: Commit**

```bash
git add \
  src/main/java/com/medhistory/specialty/Specialty.java \
  src/main/java/com/medhistory/specialty/SpecialtyRepository.java \
  src/main/java/com/medhistory/specialty/SpecialtyResponse.java \
  src/main/java/com/medhistory/specialty/SpecialtyController.java \
  src/main/java/com/medhistory/config/SecurityConfig.java \
  src/test/java/com/medhistory/specialty/SpecialtyControllerTest.java
git commit -m "feat: add GET /api/specialties endpoint"
```

---

### Task 4: Frontend — add `specialties` to api.ts

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Add the `specialties` namespace to the api object**

In `frontend/src/api.ts`, add this entry to the `api` export object (after the `push` block):

```ts
  specialties: {
    list: () => request<{ id: number; name: string }[]>('/api/specialties'),
  },
```

The full end of the `api` object should look like:

```ts
  push: {
    // ...existing push methods...
  },

  specialties: {
    list: () => request<{ id: number; name: string }[]>('/api/specialties'),
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api.ts
git commit -m "feat: add specialties.list() to frontend api client"
```

---

### Task 5: Frontend — specialty dropdown in VisitFormPage

**Files:**
- Modify: `frontend/src/pages/VisitFormPage.tsx`

- [ ] **Step 1: Add specialty dropdown state and load logic**

Replace the existing state declarations at the top of `VisitFormPage` with the version below. Keep all existing state; add the four new variables:

```tsx
// Existing state (unchanged)
const [form, setForm] = useState<VisitRequest>(empty);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState('');

// New: specialty dropdown
const [specialties, setSpecialties] = useState<{ id: number; name: string }[]>([]);
const [specialtyFailed, setSpecialtyFailed] = useState(false);
const [selectValue, setSelectValue] = useState('');
const [customSpecialty, setCustomSpecialty] = useState('');
const [specialtyInitialized, setSpecialtyInitialized] = useState(false);
```

Add a `useEffect` to load specialties on mount (after the existing imports, before the edit-load `useEffect`):

```tsx
useEffect(() => {
  api.specialties.list()
    .then(setSpecialties)
    .catch(() => setSpecialtyFailed(true));
}, []);
```

Add a second `useEffect` to sync the dropdown when editing — runs once when both `specialties` and `form.specialty` are available:

```tsx
useEffect(() => {
  if (specialtyInitialized || specialties.length === 0) return;
  if (form.specialty) {
    const match = specialties.find((s) => s.name === form.specialty);
    setSelectValue(match ? form.specialty : '__other__');
    if (!match) setCustomSpecialty(form.specialty);
  }
  setSpecialtyInitialized(true);
}, [specialties, form.specialty, specialtyInitialized]);
```

- [ ] **Step 2: Update handleSubmit to derive the effective specialty**

Replace the existing `handleSubmit` function body with:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setError('');
  const effectiveSpecialty = selectValue === '__other__' ? customSpecialty : selectValue;
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
```

- [ ] **Step 3: Replace the specialty `<input>` with the dropdown**

Find this block in the JSX (the specialty label):

```tsx
<label style={styles.label}>
  Specialty
  <input style={styles.input} value={form.specialty ?? ''}
    placeholder="GP, Cardiology…" onChange={field('specialty')} />
</label>
```

Replace it with:

```tsx
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
```

- [ ] **Step 4: TypeScript compile check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 5: Manual smoke test**

With both the Spring Boot backend and Vite dev server running:

1. Open `http://localhost:5173/visits/new`
   - Specialty field shows a dropdown with 30 options
   - Selecting "Other…" reveals a text input below
   - Selecting a predefined specialty hides the text input
   - Save a visit with "Cardiology" — visit detail page shows "Cardiology"
   - Save a visit with "Other…" + "Neonatology" — visit detail page shows "Neonatology"

2. Open an existing visit that had a predefined specialty → click Edit
   - Dropdown pre-selects the correct specialty

3. Open an existing visit that had a custom specialty → click Edit
   - Dropdown shows "Other…" selected, text input shows the custom value

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/VisitFormPage.tsx
git commit -m "feat: replace specialty text input with seeded dropdown + Other fallback"
```
