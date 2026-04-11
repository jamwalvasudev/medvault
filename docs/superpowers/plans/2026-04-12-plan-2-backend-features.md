# Medical History Manager — Plan 2: Backend Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 1 (Foundation) must be complete. Docker Compose must be running.

**Goal:** Implement all REST API endpoints — visits (CRUD + full-text search), medications, recommendations, file attachments (R2/MinIO), medication reminders, and browser Web Push notifications.

**Architecture:** Each feature domain is a self-contained package (entity, repository, service, controller, DTOs). Services enforce user ownership — every write operation verifies the authenticated user owns the resource. Attachment upload streams directly to R2/MinIO; download uses presigned URLs (credentials never reach the client). Web Push uses VAPID via the `nl.martijndwars:web-push` library. Spring Scheduler fires due reminders every minute.

**Tech Stack:** Spring Boot 3.3.x · Spring Data JPA · Hibernate Envers (`@Audited`) · AWS SDK v2 S3Client · nl.martijndwars web-push · Micrometer counters · JUnit 5 + Mockito + @WebMvcTest

---

## File Map

| Path | Purpose |
|------|---------|
| `src/main/java/com/medhistory/visit/Visit.java` | Visit entity (`@Audited`) |
| `src/main/java/com/medhistory/visit/VisitRepository.java` | CRUD + native search query |
| `src/main/java/com/medhistory/visit/VisitService.java` | CRUD, search, ownership check, search vector refresh |
| `src/main/java/com/medhistory/visit/VisitController.java` | All visit endpoints |
| `src/main/java/com/medhistory/visit/VisitRequest.java` | Create/update request DTO |
| `src/main/java/com/medhistory/visit/VisitResponse.java` | Full detail DTO |
| `src/main/java/com/medhistory/visit/VisitSummary.java` | Lightweight timeline/list DTO |
| `src/main/java/com/medhistory/medication/Medication.java` | Medication entity (`@Audited`) |
| `src/main/java/com/medhistory/medication/MedicationRepository.java` | `findByVisitId` |
| `src/main/java/com/medhistory/medication/MedicationService.java` | CRUD + ownership |
| `src/main/java/com/medhistory/medication/MedicationController.java` | Nested under `/api/visits/{visitId}/medications` |
| `src/main/java/com/medhistory/medication/MedicationRequest.java` | DTO |
| `src/main/java/com/medhistory/medication/MedicationResponse.java` | DTO |
| `src/main/java/com/medhistory/recommendation/Recommendation.java` | Recommendation entity (`@Audited`) |
| `src/main/java/com/medhistory/recommendation/RecommendationRepository.java` | `findByVisitId` |
| `src/main/java/com/medhistory/recommendation/RecommendationService.java` | CRUD + ownership |
| `src/main/java/com/medhistory/recommendation/RecommendationController.java` | Nested under `/api/visits/{visitId}/recommendations` |
| `src/main/java/com/medhistory/recommendation/RecommendationRequest.java` | DTO |
| `src/main/java/com/medhistory/recommendation/RecommendationResponse.java` | DTO |
| `src/main/java/com/medhistory/attachment/Attachment.java` | Attachment metadata entity (`@Audited`) |
| `src/main/java/com/medhistory/attachment/AttachmentRepository.java` | `findByVisitId` |
| `src/main/java/com/medhistory/attachment/AttachmentService.java` | Upload/presign/delete via S3Client |
| `src/main/java/com/medhistory/attachment/AttachmentController.java` | Multipart upload, presigned URL, delete |
| `src/main/java/com/medhistory/attachment/AttachmentResponse.java` | DTO |
| `src/main/java/com/medhistory/reminder/MedicationReminder.java` | Reminder entity (`@Audited`) |
| `src/main/java/com/medhistory/reminder/MedicationReminderRepository.java` | `findByMedicationId`, `findDueReminders` |
| `src/main/java/com/medhistory/reminder/MedicationReminderService.java` | CRUD |
| `src/main/java/com/medhistory/reminder/MedicationReminderController.java` | Nested under `/api/medications/{medicationId}/reminders` |
| `src/main/java/com/medhistory/reminder/ReminderRequest.java` | DTO |
| `src/main/java/com/medhistory/reminder/ReminderResponse.java` | DTO |
| `src/main/java/com/medhistory/reminder/ReminderScheduler.java` | `@Scheduled(fixedDelay = 60_000)` |
| `src/main/java/com/medhistory/push/PushSubscription.java` | Push subscription entity |
| `src/main/java/com/medhistory/push/PushSubscriptionRepository.java` | `findByUserId` |
| `src/main/java/com/medhistory/push/PushService.java` | VAPID push sender |
| `src/main/java/com/medhistory/push/PushController.java` | Subscribe/unsubscribe |
| `src/main/java/com/medhistory/push/PushSubscriptionRequest.java` | DTO |
| `src/test/java/com/medhistory/visit/VisitServiceTest.java` | Unit tests |
| `src/test/java/com/medhistory/visit/VisitControllerTest.java` | `@WebMvcTest` |
| `src/test/java/com/medhistory/medication/MedicationServiceTest.java` | Unit tests |
| `src/test/java/com/medhistory/recommendation/RecommendationServiceTest.java` | Unit tests |
| `src/test/java/com/medhistory/attachment/AttachmentServiceTest.java` | Unit tests (mocked S3) |
| `src/test/java/com/medhistory/push/PushServiceTest.java` | Unit tests (mocked push) |

---

## Task 1: Visit Entity, Repository, Service (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/visit/Visit.java`
- Create: `src/main/java/com/medhistory/visit/VisitRepository.java`
- Create: `src/main/java/com/medhistory/visit/VisitService.java`
- Create: `src/main/java/com/medhistory/visit/VisitRequest.java`
- Create: `src/main/java/com/medhistory/visit/VisitResponse.java`
- Create: `src/main/java/com/medhistory/visit/VisitSummary.java`
- Create: `src/test/java/com/medhistory/visit/VisitServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/visit/VisitServiceTest.java`:

```java
package com.medhistory.visit;

import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VisitServiceTest {

    @Mock private VisitRepository visitRepository;
    @Mock private UserRepository userRepository;
    private VisitService visitService;

    private final UUID userId = UUID.randomUUID();
    private User user;

    @BeforeEach
    void setUp() {
        visitService = new VisitService(visitRepository, userRepository);
        user = new User();
        user.setId(userId);
    }

    @Test
    void create_savesVisitWithUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> {
            Visit v = inv.getArgument(0);
            v.setId(UUID.randomUUID());
            return v;
        });

        VisitRequest req = new VisitRequest(LocalDate.now(), "Dr Smith", "GP", "Clinic A",
                "Sore throat", "Pharyngitis", "Rest");
        Visit result = visitService.create(userId, req);

        assertThat(result.getDoctorName()).isEqualTo("Dr Smith");
        assertThat(result.getUser().getId()).isEqualTo(userId);
        verify(visitRepository).save(any(Visit.class));
    }

    @Test
    void delete_throwsWhenUserDoesNotOwnVisit() {
        UUID otherUserId = UUID.randomUUID();
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        User owner = new User();
        owner.setId(otherUserId);
        visit.setUser(owner);

        when(visitRepository.findById(visit.getId())).thenReturn(Optional.of(visit));

        assertThatThrownBy(() -> visitService.delete(userId, visit.getId()))
                .isInstanceOf(SecurityException.class);
        verify(visitRepository, never()).delete(any());
    }

    @Test
    void list_returnsOnlyUserVisits() {
        Visit v1 = new Visit();
        v1.setId(UUID.randomUUID());
        v1.setVisitDate(LocalDate.now());

        when(visitRepository.findByUserId(eq(userId), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(v1)));

        var page = visitService.list(userId, PageRequest.of(0, 20));
        assertThat(page.getContent()).hasSize(1);
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=VisitServiceTest -q 2>&1 | tail -5
```

Expected: compilation failure.

- [ ] **Step 3: Create `Visit.java`**

```java
package com.medhistory.visit;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.user.User;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "visits")
@Audited
public class Visit extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(name = "doctor_name")
    private String doctorName;

    private String specialty;
    private String clinic;

    @Column(name = "chief_complaint", columnDefinition = "text")
    private String chiefComplaint;

    @Column(columnDefinition = "text")
    private String diagnosis;

    @Column(columnDefinition = "text")
    private String notes;

    // search_vector is managed entirely by the DB trigger — not mapped as a JPA field
    // It is marked @NotAudited via Envers configuration

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
    public String getClinic() { return clinic; }
    public void setClinic(String clinic) { this.clinic = clinic; }
    public String getChiefComplaint() { return chiefComplaint; }
    public void setChiefComplaint(String chiefComplaint) { this.chiefComplaint = chiefComplaint; }
    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
```

- [ ] **Step 4: Create `VisitRequest.java`**

```java
package com.medhistory.visit;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record VisitRequest(
        @NotNull LocalDate visitDate,
        String doctorName,
        String specialty,
        String clinic,
        String chiefComplaint,
        String diagnosis,
        String notes
) {}
```

- [ ] **Step 5: Create `VisitSummary.java`**

```java
package com.medhistory.visit;

import java.time.LocalDate;
import java.util.UUID;

public record VisitSummary(
        UUID id,
        LocalDate visitDate,
        String doctorName,
        String specialty,
        String diagnosis,
        int medicationCount,
        int attachmentCount
) {
    public static VisitSummary from(Visit visit) {
        return new VisitSummary(
                visit.getId(),
                visit.getVisitDate(),
                visit.getDoctorName(),
                visit.getSpecialty(),
                visit.getDiagnosis() != null && visit.getDiagnosis().length() > 120
                        ? visit.getDiagnosis().substring(0, 120) + "…"
                        : visit.getDiagnosis(),
                0, // populated by service when needed
                0
        );
    }
}
```

- [ ] **Step 6: Create `VisitResponse.java`**

```java
package com.medhistory.visit;

import java.time.LocalDate;
import java.util.UUID;

public record VisitResponse(
        UUID id,
        LocalDate visitDate,
        String doctorName,
        String specialty,
        String clinic,
        String chiefComplaint,
        String diagnosis,
        String notes
) {
    public static VisitResponse from(Visit visit) {
        return new VisitResponse(
                visit.getId(),
                visit.getVisitDate(),
                visit.getDoctorName(),
                visit.getSpecialty(),
                visit.getClinic(),
                visit.getChiefComplaint(),
                visit.getDiagnosis(),
                visit.getNotes()
        );
    }
}
```

- [ ] **Step 7: Create `VisitRepository.java`**

```java
package com.medhistory.visit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface VisitRepository extends JpaRepository<Visit, UUID> {

    Page<Visit> findByUserIdOrderByVisitDateDesc(UUID userId, Pageable pageable);

    default Page<Visit> findByUserId(UUID userId, Pageable pageable) {
        return findByUserIdOrderByVisitDateDesc(userId, pageable);
    }

    @Query(value = """
            SELECT v.* FROM visits v
            WHERE v.user_id = :userId
              AND v.search_vector @@ plainto_tsquery('english', :query)
            ORDER BY ts_rank(v.search_vector, plainto_tsquery('english', :query)) DESC
            """, nativeQuery = true)
    List<Visit> search(@Param("userId") UUID userId, @Param("query") String query);

    @Modifying
    @Query(value = """
            UPDATE visits SET search_vector = to_tsvector('english',
                coalesce(doctor_name,'') || ' ' ||
                coalesce(specialty,'') || ' ' ||
                coalesce(diagnosis,'') || ' ' ||
                coalesce(chief_complaint,'') || ' ' ||
                coalesce(notes,'') || ' ' ||
                coalesce((SELECT string_agg(m.name,' ') FROM medications m WHERE m.visit_id = visits.id),'') || ' ' ||
                coalesce((SELECT string_agg(r.description,' ') FROM recommendations r WHERE r.visit_id = visits.id),'')
            )
            WHERE id = :visitId
            """, nativeQuery = true)
    void refreshSearchVector(@Param("visitId") UUID visitId);
}
```

- [ ] **Step 8: Create `VisitService.java`**

```java
package com.medhistory.visit;

import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class VisitService {

    private final VisitRepository visitRepository;
    private final UserRepository userRepository;

    public VisitService(VisitRepository visitRepository, UserRepository userRepository) {
        this.visitRepository = visitRepository;
        this.userRepository = userRepository;
    }

    public Visit create(UUID userId, VisitRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Visit visit = new Visit();
        visit.setUser(user);
        applyRequest(visit, req);
        return visitRepository.save(visit);
    }

    @Transactional(readOnly = true)
    public Page<Visit> list(UUID userId, Pageable pageable) {
        return visitRepository.findByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Visit getById(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        assertOwner(userId, visit);
        return visit;
    }

    public Visit update(UUID userId, UUID visitId, VisitRequest req) {
        Visit visit = getById(userId, visitId);
        applyRequest(visit, req);
        return visitRepository.save(visit);
    }

    public void delete(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        assertOwner(userId, visit);
        visitRepository.delete(visit);
    }

    @Transactional(readOnly = true)
    public List<Visit> search(UUID userId, String query) {
        return visitRepository.search(userId, query);
    }

    public void refreshSearchVector(UUID visitId) {
        visitRepository.refreshSearchVector(visitId);
    }

    private void applyRequest(Visit visit, VisitRequest req) {
        visit.setVisitDate(req.visitDate());
        visit.setDoctorName(req.doctorName());
        visit.setSpecialty(req.specialty());
        visit.setClinic(req.clinic());
        visit.setChiefComplaint(req.chiefComplaint());
        visit.setDiagnosis(req.diagnosis());
        visit.setNotes(req.notes());
    }

    private void assertOwner(UUID userId, Visit visit) {
        if (!visit.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
    }
}
```

- [ ] **Step 9: Run the tests to confirm they pass**

```bash
mvn test -Dtest=VisitServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 10: Commit**

```bash
git add src/main/java/com/medhistory/visit/ src/test/java/com/medhistory/visit/VisitServiceTest.java
git commit -m "feat: add Visit entity, repository, and service (TDD)"
```

---

## Task 2: Visit Controller (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/visit/VisitController.java`
- Create: `src/test/java/com/medhistory/visit/VisitControllerTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/visit/VisitControllerTest.java`:

```java
package com.medhistory.visit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medhistory.auth.JwtFilter;
import com.medhistory.auth.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VisitController.class)
class VisitControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean VisitService visitService;
    @MockBean JwtService jwtService;
    @MockBean JwtFilter jwtFilter;

    private static final String USER_ID = "00000000-0000-0000-0000-000000000001";

    @Test
    @WithMockUser(username = USER_ID)
    void listVisits_returns200WithPage() throws Exception {
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setVisitDate(LocalDate.now());
        when(visitService.list(eq(UUID.fromString(USER_ID)), any()))
                .thenReturn(new PageImpl<>(List.of(visit)));

        mockMvc.perform(get("/api/visits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].visitDate").isNotEmpty());
    }

    @Test
    @WithMockUser(username = USER_ID)
    void createVisit_returns201WithVisit() throws Exception {
        VisitRequest req = new VisitRequest(LocalDate.now(), "Dr Jones", null, null, null, null, null);
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setVisitDate(req.visitDate());
        visit.setDoctorName(req.doctorName());

        when(visitService.create(eq(UUID.fromString(USER_ID)), any())).thenReturn(visit);

        mockMvc.perform(post("/api/visits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.doctorName").value("Dr Jones"));
    }

    @Test
    @WithMockUser(username = USER_ID)
    void searchVisits_returns200WithResults() throws Exception {
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setDiagnosis("Pharyngitis");
        when(visitService.search(eq(UUID.fromString(USER_ID)), eq("throat")))
                .thenReturn(List.of(visit));

        mockMvc.perform(get("/api/visits/search").param("q", "throat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].diagnosis").value("Pharyngitis"));
    }

    @Test
    void listVisits_returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/visits"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=VisitControllerTest -q 2>&1 | tail -5
```

Expected: compilation failure (VisitController not yet created).

- [ ] **Step 3: Create `VisitController.java`**

```java
package com.medhistory.visit;

import com.medhistory.auth.SecurityUtils;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits")
public class VisitController {

    private final VisitService visitService;
    private final MeterRegistry meterRegistry;

    public VisitController(VisitService visitService, MeterRegistry meterRegistry) {
        this.visitService = visitService;
        this.meterRegistry = meterRegistry;
    }

    @GetMapping
    public ResponseEntity<Page<VisitSummary>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = currentUserId();
        Page<VisitSummary> result = visitService.list(userId, PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "visitDate")))
                .map(VisitSummary::from);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<VisitResponse> create(@Valid @RequestBody VisitRequest req) {
        UUID userId = currentUserId();
        Visit visit = visitService.create(userId, req);
        meterRegistry.counter("medhistory.visits.created").increment();
        return ResponseEntity.status(201).body(VisitResponse.from(visit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VisitResponse> get(@PathVariable UUID id) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(VisitResponse.from(visitService.getById(userId, id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VisitResponse> update(@PathVariable UUID id,
                                                @Valid @RequestBody VisitRequest req) {
        UUID userId = currentUserId();
        Visit visit = visitService.update(userId, id, req);
        return ResponseEntity.ok(VisitResponse.from(visit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        visitService.delete(currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<VisitSummary>> search(@RequestParam String q) {
        UUID userId = currentUserId();
        List<VisitSummary> results = visitService.search(userId, q)
                .stream().map(VisitSummary::from).toList();
        return ResponseEntity.ok(results);
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
mvn test -Dtest=VisitControllerTest -q 2>&1 | tail -5
```

Expected: `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/medhistory/visit/VisitController.java \
  src/test/java/com/medhistory/visit/VisitControllerTest.java
git commit -m "feat: add visit CRUD + search REST endpoints (TDD)"
```

---

## Task 3: Medication Entity, Service, Controller (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/medication/Medication.java`
- Create: `src/main/java/com/medhistory/medication/MedicationRepository.java`
- Create: `src/main/java/com/medhistory/medication/MedicationService.java`
- Create: `src/main/java/com/medhistory/medication/MedicationController.java`
- Create: `src/main/java/com/medhistory/medication/MedicationRequest.java`
- Create: `src/main/java/com/medhistory/medication/MedicationResponse.java`
- Create: `src/test/java/com/medhistory/medication/MedicationServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/medication/MedicationServiceTest.java`:

```java
package com.medhistory.medication;

import com.medhistory.user.User;
import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import com.medhistory.visit.VisitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MedicationServiceTest {

    @Mock private MedicationRepository medicationRepository;
    @Mock private VisitRepository visitRepository;
    @Mock private VisitService visitService;
    private MedicationService medicationService;

    private final UUID userId = UUID.randomUUID();
    private final UUID visitId = UUID.randomUUID();
    private Visit visit;

    @BeforeEach
    void setUp() {
        medicationService = new MedicationService(medicationRepository, visitRepository, visitService);
        User owner = new User();
        owner.setId(userId);
        visit = new Visit();
        visit.setId(visitId);
        visit.setUser(owner);
    }

    @Test
    void create_savesMedicationForVisit() {
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));
        when(medicationRepository.save(any(Medication.class))).thenAnswer(inv -> {
            Medication m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        MedicationRequest req = new MedicationRequest("Amoxicillin", "500mg", "TDS", 5, "yes", null, true);
        Medication result = medicationService.create(userId, visitId, req);

        assertThat(result.getName()).isEqualTo("Amoxicillin");
        verify(visitService).refreshSearchVector(visitId);
    }

    @Test
    void create_throwsWhenUserDoesNotOwnVisit() {
        UUID otherUserId = UUID.randomUUID();
        User other = new User();
        other.setId(otherUserId);
        visit.setUser(other);
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));

        MedicationRequest req = new MedicationRequest("Med", null, null, null, null, null, null);
        assertThatThrownBy(() -> medicationService.create(userId, visitId, req))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void findByVisitId_returnsMedications() {
        Medication m = new Medication();
        m.setId(UUID.randomUUID());
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));
        when(medicationRepository.findByVisitId(visitId)).thenReturn(List.of(m));

        List<Medication> results = medicationService.findByVisitId(userId, visitId);
        assertThat(results).hasSize(1);
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=MedicationServiceTest -q 2>&1 | tail -5
```

Expected: compilation failure.

- [ ] **Step 3: Create `Medication.java`**

```java
package com.medhistory.medication;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.visit.Visit;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

@Entity
@Table(name = "medications")
@Audited
public class Medication extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(nullable = false)
    private String name;

    private String dosage;
    private String frequency;

    @Column(name = "duration_days")
    private Integer durationDays;

    private String worked;   // 'yes' | 'no' | 'partial'

    @Column(name = "side_effects", columnDefinition = "text")
    private String sideEffects;

    @Column(name = "would_use_again")
    private Boolean wouldUseAgain;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Visit getVisit() { return visit; }
    public void setVisit(Visit visit) { this.visit = visit; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
    public String getWorked() { return worked; }
    public void setWorked(String worked) { this.worked = worked; }
    public String getSideEffects() { return sideEffects; }
    public void setSideEffects(String sideEffects) { this.sideEffects = sideEffects; }
    public Boolean getWouldUseAgain() { return wouldUseAgain; }
    public void setWouldUseAgain(Boolean wouldUseAgain) { this.wouldUseAgain = wouldUseAgain; }
}
```

- [ ] **Step 4: Create `MedicationRequest.java`**

```java
package com.medhistory.medication;

import jakarta.validation.constraints.NotBlank;

public record MedicationRequest(
        @NotBlank String name,
        String dosage,
        String frequency,
        Integer durationDays,
        String worked,
        String sideEffects,
        Boolean wouldUseAgain
) {}
```

- [ ] **Step 5: Create `MedicationResponse.java`**

```java
package com.medhistory.medication;

import java.util.UUID;

public record MedicationResponse(
        UUID id,
        UUID visitId,
        String name,
        String dosage,
        String frequency,
        Integer durationDays,
        String worked,
        String sideEffects,
        Boolean wouldUseAgain
) {
    public static MedicationResponse from(Medication m) {
        return new MedicationResponse(
                m.getId(),
                m.getVisit().getId(),
                m.getName(),
                m.getDosage(),
                m.getFrequency(),
                m.getDurationDays(),
                m.getWorked(),
                m.getSideEffects(),
                m.getWouldUseAgain()
        );
    }
}
```

- [ ] **Step 6: Create `MedicationRepository.java`**

```java
package com.medhistory.medication;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MedicationRepository extends JpaRepository<Medication, UUID> {
    List<Medication> findByVisitId(UUID visitId);
}
```

- [ ] **Step 7: Create `MedicationService.java`**

```java
package com.medhistory.medication;

import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import com.medhistory.visit.VisitService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final VisitRepository visitRepository;
    private final VisitService visitService;

    public MedicationService(MedicationRepository medicationRepository,
                             VisitRepository visitRepository,
                             VisitService visitService) {
        this.medicationRepository = medicationRepository;
        this.visitRepository = visitRepository;
        this.visitService = visitService;
    }

    public Medication create(UUID userId, UUID visitId, MedicationRequest req) {
        Visit visit = requireOwnedVisit(userId, visitId);
        Medication med = new Medication();
        med.setVisit(visit);
        apply(med, req);
        Medication saved = medicationRepository.save(med);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public Medication update(UUID userId, UUID visitId, UUID medicationId, MedicationRequest req) {
        requireOwnedVisit(userId, visitId);
        Medication med = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        apply(med, req);
        Medication saved = medicationRepository.save(med);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public void delete(UUID userId, UUID visitId, UUID medicationId) {
        requireOwnedVisit(userId, visitId);
        medicationRepository.deleteById(medicationId);
        visitService.refreshSearchVector(visitId);
    }

    @Transactional(readOnly = true)
    public List<Medication> findByVisitId(UUID userId, UUID visitId) {
        requireOwnedVisit(userId, visitId);
        return medicationRepository.findByVisitId(visitId);
    }

    @Transactional(readOnly = true)
    public Medication getById(UUID medicationId) {
        return medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
    }

    private Visit requireOwnedVisit(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
        return visit;
    }

    private void apply(Medication med, MedicationRequest req) {
        med.setName(req.name());
        med.setDosage(req.dosage());
        med.setFrequency(req.frequency());
        med.setDurationDays(req.durationDays());
        med.setWorked(req.worked());
        med.setSideEffects(req.sideEffects());
        med.setWouldUseAgain(req.wouldUseAgain());
    }
}
```

- [ ] **Step 8: Create `MedicationController.java`**

```java
package com.medhistory.medication;

import com.medhistory.auth.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits/{visitId}/medications")
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> list(@PathVariable UUID visitId) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(medicationService.findByVisitId(userId, visitId)
                .stream().map(MedicationResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<MedicationResponse> create(@PathVariable UUID visitId,
                                                     @Valid @RequestBody MedicationRequest req) {
        UUID userId = currentUserId();
        return ResponseEntity.status(201)
                .body(MedicationResponse.from(medicationService.create(userId, visitId, req)));
    }

    @PutMapping("/{medicationId}")
    public ResponseEntity<MedicationResponse> update(@PathVariable UUID visitId,
                                                     @PathVariable UUID medicationId,
                                                     @Valid @RequestBody MedicationRequest req) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(MedicationResponse.from(
                medicationService.update(userId, visitId, medicationId, req)));
    }

    @DeleteMapping("/{medicationId}")
    public ResponseEntity<Void> delete(@PathVariable UUID visitId,
                                       @PathVariable UUID medicationId) {
        medicationService.delete(currentUserId(), visitId, medicationId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
```

- [ ] **Step 9: Run the tests**

```bash
mvn test -Dtest=MedicationServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 11: Commit**

```bash
git add src/main/java/com/medhistory/medication/ src/test/java/com/medhistory/medication/
git commit -m "feat: add Medication CRUD endpoints with search vector refresh (TDD)"
```

---

## Task 4: Recommendation Entity, Service, Controller (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/recommendation/Recommendation.java`
- Create: `src/main/java/com/medhistory/recommendation/RecommendationRepository.java`
- Create: `src/main/java/com/medhistory/recommendation/RecommendationService.java`
- Create: `src/main/java/com/medhistory/recommendation/RecommendationController.java`
- Create: `src/main/java/com/medhistory/recommendation/RecommendationRequest.java`
- Create: `src/main/java/com/medhistory/recommendation/RecommendationResponse.java`
- Create: `src/test/java/com/medhistory/recommendation/RecommendationServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/recommendation/RecommendationServiceTest.java`:

```java
package com.medhistory.recommendation;

import com.medhistory.user.User;
import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import com.medhistory.visit.VisitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock private RecommendationRepository recommendationRepository;
    @Mock private VisitRepository visitRepository;
    @Mock private VisitService visitService;
    private RecommendationService recommendationService;

    private final UUID userId = UUID.randomUUID();
    private final UUID visitId = UUID.randomUUID();
    private Visit visit;

    @BeforeEach
    void setUp() {
        recommendationService = new RecommendationService(recommendationRepository, visitRepository, visitService);
        User owner = new User();
        owner.setId(userId);
        visit = new Visit();
        visit.setId(visitId);
        visit.setUser(owner);
    }

    @Test
    void create_savesRecommendationAndRefreshesSearch() {
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));
        when(recommendationRepository.save(any(Recommendation.class))).thenAnswer(inv -> {
            Recommendation r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        RecommendationRequest req = new RecommendationRequest("physical", "30 min walk daily");
        Recommendation result = recommendationService.create(userId, visitId, req);

        assertThat(result.getDescription()).isEqualTo("30 min walk daily");
        verify(visitService).refreshSearchVector(visitId);
    }

    @Test
    void findByVisitId_returnsAll() {
        Recommendation r = new Recommendation();
        r.setId(UUID.randomUUID());
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));
        when(recommendationRepository.findByVisitId(visitId)).thenReturn(List.of(r));

        assertThat(recommendationService.findByVisitId(userId, visitId)).hasSize(1);
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=RecommendationServiceTest -q 2>&1 | tail -5
```

Expected: compilation failure.

- [ ] **Step 3: Create `Recommendation.java`**

```java
package com.medhistory.recommendation;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.visit.Visit;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

@Entity
@Table(name = "recommendations")
@Audited
public class Recommendation extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(nullable = false)
    private String type;   // 'physical' | 'diet' | 'other'

    @Column(columnDefinition = "text", nullable = false)
    private String description;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Visit getVisit() { return visit; }
    public void setVisit(Visit visit) { this.visit = visit; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
```

- [ ] **Step 4: Create `RecommendationRequest.java`**

```java
package com.medhistory.recommendation;

import jakarta.validation.constraints.NotBlank;

public record RecommendationRequest(
        @NotBlank String type,
        @NotBlank String description
) {}
```

- [ ] **Step 5: Create `RecommendationResponse.java`**

```java
package com.medhistory.recommendation;

import java.util.UUID;

public record RecommendationResponse(UUID id, UUID visitId, String type, String description) {
    public static RecommendationResponse from(Recommendation r) {
        return new RecommendationResponse(r.getId(), r.getVisit().getId(), r.getType(), r.getDescription());
    }
}
```

- [ ] **Step 6: Create `RecommendationRepository.java`**

```java
package com.medhistory.recommendation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RecommendationRepository extends JpaRepository<Recommendation, UUID> {
    List<Recommendation> findByVisitId(UUID visitId);
}
```

- [ ] **Step 7: Create `RecommendationService.java`**

```java
package com.medhistory.recommendation;

import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import com.medhistory.visit.VisitService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final VisitRepository visitRepository;
    private final VisitService visitService;

    public RecommendationService(RecommendationRepository recommendationRepository,
                                 VisitRepository visitRepository,
                                 VisitService visitService) {
        this.recommendationRepository = recommendationRepository;
        this.visitRepository = visitRepository;
        this.visitService = visitService;
    }

    public Recommendation create(UUID userId, UUID visitId, RecommendationRequest req) {
        Visit visit = requireOwnedVisit(userId, visitId);
        Recommendation rec = new Recommendation();
        rec.setVisit(visit);
        rec.setType(req.type());
        rec.setDescription(req.description());
        Recommendation saved = recommendationRepository.save(rec);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public Recommendation update(UUID userId, UUID visitId, UUID recId, RecommendationRequest req) {
        requireOwnedVisit(userId, visitId);
        Recommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found"));
        rec.setType(req.type());
        rec.setDescription(req.description());
        Recommendation saved = recommendationRepository.save(rec);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public void delete(UUID userId, UUID visitId, UUID recId) {
        requireOwnedVisit(userId, visitId);
        recommendationRepository.deleteById(recId);
        visitService.refreshSearchVector(visitId);
    }

    @Transactional(readOnly = true)
    public List<Recommendation> findByVisitId(UUID userId, UUID visitId) {
        requireOwnedVisit(userId, visitId);
        return recommendationRepository.findByVisitId(visitId);
    }

    private Visit requireOwnedVisit(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getUser().getId().equals(userId)) throw new SecurityException("Access denied");
        return visit;
    }
}
```

- [ ] **Step 8: Create `RecommendationController.java`**

```java
package com.medhistory.recommendation;

import com.medhistory.auth.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits/{visitId}/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping
    public ResponseEntity<List<RecommendationResponse>> list(@PathVariable UUID visitId) {
        return ResponseEntity.ok(recommendationService.findByVisitId(currentUserId(), visitId)
                .stream().map(RecommendationResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<RecommendationResponse> create(@PathVariable UUID visitId,
                                                         @Valid @RequestBody RecommendationRequest req) {
        return ResponseEntity.status(201)
                .body(RecommendationResponse.from(
                        recommendationService.create(currentUserId(), visitId, req)));
    }

    @PutMapping("/{recId}")
    public ResponseEntity<RecommendationResponse> update(@PathVariable UUID visitId,
                                                         @PathVariable UUID recId,
                                                         @Valid @RequestBody RecommendationRequest req) {
        return ResponseEntity.ok(RecommendationResponse.from(
                recommendationService.update(currentUserId(), visitId, recId, req)));
    }

    @DeleteMapping("/{recId}")
    public ResponseEntity<Void> delete(@PathVariable UUID visitId, @PathVariable UUID recId) {
        recommendationService.delete(currentUserId(), visitId, recId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
```

- [ ] **Step 9: Run the tests**

```bash
mvn test -Dtest=RecommendationServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 10: Commit**

```bash
git add src/main/java/com/medhistory/recommendation/ src/test/java/com/medhistory/recommendation/
git commit -m "feat: add Recommendation CRUD endpoints (TDD)"
```

---

## Task 5: Attachment Upload + Presigned URL (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/attachment/Attachment.java`
- Create: `src/main/java/com/medhistory/attachment/AttachmentRepository.java`
- Create: `src/main/java/com/medhistory/attachment/AttachmentService.java`
- Create: `src/main/java/com/medhistory/attachment/AttachmentController.java`
- Create: `src/main/java/com/medhistory/attachment/AttachmentResponse.java`
- Create: `src/test/java/com/medhistory/attachment/AttachmentServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/attachment/AttachmentServiceTest.java`:

```java
package com.medhistory.attachment;

import com.medhistory.user.User;
import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URL;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock private AttachmentRepository attachmentRepository;
    @Mock private VisitRepository visitRepository;
    @Mock private S3Client s3Client;
    @Mock private S3Presigner s3Presigner;
    private MeterRegistry meterRegistry;
    private AttachmentService attachmentService;

    private final UUID userId = UUID.randomUUID();
    private final UUID visitId = UUID.randomUUID();
    private Visit visit;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        attachmentService = new AttachmentService(
                attachmentRepository, visitRepository, s3Client, s3Presigner,
                "medhistory", meterRegistry);
        User owner = new User();
        owner.setId(userId);
        visit = new Visit();
        visit.setId(visitId);
        visit.setUser(owner);
    }

    @Test
    void upload_savesAttachmentAndUploadsToS3() {
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class))).thenReturn(null);
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(inv -> {
            Attachment a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "prescription.pdf", "application/pdf", "pdf content".getBytes());
        Attachment result = attachmentService.upload(userId, visitId, file, "prescription");

        assertThat(result.getDisplayName()).isEqualTo("prescription.pdf");
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void generatePresignedUrl_returnsUrl() throws Exception {
        Attachment attachment = new Attachment();
        attachment.setId(UUID.randomUUID());
        attachment.setR2Key("uploads/test.pdf");
        attachment.setVisit(visit);

        when(attachmentRepository.findById(attachment.getId())).thenReturn(Optional.of(attachment));

        PresignedGetObjectRequest presignedReq = mock(PresignedGetObjectRequest.class);
        when(presignedReq.url()).thenReturn(new URL("https://example.com/signed"));
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedReq);

        String url = attachmentService.generatePresignedUrl(userId, attachment.getId());
        assertThat(url).isEqualTo("https://example.com/signed");
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=AttachmentServiceTest -q 2>&1 | tail -5
```

Expected: compilation failure.

- [ ] **Step 3: Create `Attachment.java`**

```java
package com.medhistory.attachment;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.visit.Visit;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

@Entity
@Table(name = "attachments")
@Audited
public class Attachment extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "r2_key", nullable = false)
    private String r2Key;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Visit getVisit() { return visit; }
    public void setVisit(Visit visit) { this.visit = visit; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getR2Key() { return r2Key; }
    public void setR2Key(String r2Key) { this.r2Key = r2Key; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
}
```

- [ ] **Step 4: Create `AttachmentRepository.java`**

```java
package com.medhistory.attachment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
    List<Attachment> findByVisitId(UUID visitId);
}
```

- [ ] **Step 5: Create `AttachmentResponse.java`**

```java
package com.medhistory.attachment;

import java.util.UUID;

public record AttachmentResponse(UUID id, UUID visitId, String displayName, String fileType,
                                  String contentType, Long sizeBytes) {
    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.getId(), a.getVisit().getId(), a.getDisplayName(),
                a.getFileType(), a.getContentType(), a.getSizeBytes());
    }
}
```

- [ ] **Step 6: Create `AttachmentService.java`**

```java
package com.medhistory.attachment;

import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final VisitRepository visitRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final MeterRegistry meterRegistry;

    public AttachmentService(AttachmentRepository attachmentRepository,
                             VisitRepository visitRepository,
                             S3Client s3Client,
                             S3Presigner s3Presigner,
                             @Value("${app.storage.bucket}") String bucket,
                             MeterRegistry meterRegistry) {
        this.attachmentRepository = attachmentRepository;
        this.visitRepository = visitRepository;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.meterRegistry = meterRegistry;
    }

    public Attachment upload(UUID userId, UUID visitId, MultipartFile file, String fileType) {
        Visit visit = requireOwnedVisit(userId, visitId);
        String key = "attachments/" + visitId + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file", e);
        }

        Attachment attachment = new Attachment();
        attachment.setVisit(visit);
        attachment.setDisplayName(file.getOriginalFilename());
        attachment.setR2Key(key);
        attachment.setFileType(fileType);
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());

        meterRegistry.counter("medhistory.attachments.uploaded").increment();
        return attachmentRepository.save(attachment);
    }

    @Transactional(readOnly = true)
    public String generatePresignedUrl(UUID userId, UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        assertOwner(userId, attachment);

        var presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(30))
                .getObjectRequest(r -> r.bucket(bucket).key(attachment.getR2Key()))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public void delete(UUID userId, UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        assertOwner(userId, attachment);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket).key(attachment.getR2Key()).build());
        attachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public List<Attachment> findByVisitId(UUID userId, UUID visitId) {
        requireOwnedVisit(userId, visitId);
        return attachmentRepository.findByVisitId(visitId);
    }

    private Visit requireOwnedVisit(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getUser().getId().equals(userId)) throw new SecurityException("Access denied");
        return visit;
    }

    private void assertOwner(UUID userId, Attachment attachment) {
        if (!attachment.getVisit().getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
    }
}
```

- [ ] **Step 7: Create `AttachmentController.java`**

```java
package com.medhistory.attachment;

import com.medhistory.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits/{visitId}/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> list(@PathVariable UUID visitId) {
        return ResponseEntity.ok(attachmentService.findByVisitId(currentUserId(), visitId)
                .stream().map(AttachmentResponse::from).toList());
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<AttachmentResponse> upload(
            @PathVariable UUID visitId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "fileType", defaultValue = "other") String fileType) {
        Attachment attachment = attachmentService.upload(currentUserId(), visitId, file, fileType);
        return ResponseEntity.status(201).body(AttachmentResponse.from(attachment));
    }

    @GetMapping("/{attachmentId}/url")
    public ResponseEntity<Map<String, String>> presignedUrl(@PathVariable UUID visitId,
                                                            @PathVariable UUID attachmentId) {
        String url = attachmentService.generatePresignedUrl(currentUserId(), attachmentId);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID visitId, @PathVariable UUID attachmentId) {
        attachmentService.delete(currentUserId(), attachmentId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
```

- [ ] **Step 8: Run the tests**

```bash
mvn test -Dtest=AttachmentServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 9: Commit**

```bash
git add src/main/java/com/medhistory/attachment/ src/test/java/com/medhistory/attachment/
git commit -m "feat: add Attachment upload/presign/delete via S3 (TDD)"
```

---

## Task 6: Medication Reminders

**Files:**
- Create: `src/main/java/com/medhistory/reminder/MedicationReminder.java`
- Create: `src/main/java/com/medhistory/reminder/MedicationReminderRepository.java`
- Create: `src/main/java/com/medhistory/reminder/MedicationReminderService.java`
- Create: `src/main/java/com/medhistory/reminder/MedicationReminderController.java`
- Create: `src/main/java/com/medhistory/reminder/ReminderRequest.java`
- Create: `src/main/java/com/medhistory/reminder/ReminderResponse.java`
- Create: `src/main/java/com/medhistory/reminder/ReminderScheduler.java`

- [ ] **Step 1: Create `MedicationReminder.java`**

```java
package com.medhistory.reminder;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.medication.Medication;
import com.medhistory.user.User;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "medication_reminders")
@Audited
public class MedicationReminder extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_id", nullable = false)
    private Medication medication;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "reminder_time", nullable = false)
    private LocalTime reminderTime;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_sent_at")
    private Instant lastSentAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Medication getMedication() { return medication; }
    public void setMedication(Medication medication) { this.medication = medication; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalTime getReminderTime() { return reminderTime; }
    public void setReminderTime(LocalTime reminderTime) { this.reminderTime = reminderTime; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(Instant lastSentAt) { this.lastSentAt = lastSentAt; }
}
```

- [ ] **Step 2: Create `ReminderRequest.java`**

```java
package com.medhistory.reminder;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record ReminderRequest(@NotNull LocalTime reminderTime) {}
```

- [ ] **Step 3: Create `ReminderResponse.java`**

```java
package com.medhistory.reminder;

import java.time.LocalTime;
import java.util.UUID;

public record ReminderResponse(UUID id, UUID medicationId, LocalTime reminderTime, boolean active) {
    public static ReminderResponse from(MedicationReminder r) {
        return new ReminderResponse(r.getId(), r.getMedication().getId(), r.getReminderTime(), r.isActive());
    }
}
```

- [ ] **Step 4: Create `MedicationReminderRepository.java`**

```java
package com.medhistory.reminder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface MedicationReminderRepository extends JpaRepository<MedicationReminder, UUID> {

    List<MedicationReminder> findByMedicationId(UUID medicationId);

    @Query("""
            SELECT r FROM MedicationReminder r
            WHERE r.active = true
              AND HOUR(r.reminderTime) = HOUR(:now)
              AND MINUTE(r.reminderTime) = MINUTE(:now)
            """)
    List<MedicationReminder> findDueReminders(@Param("now") LocalTime now);
}
```

- [ ] **Step 5: Create `MedicationReminderService.java`**

```java
package com.medhistory.reminder;

import com.medhistory.medication.Medication;
import com.medhistory.medication.MedicationRepository;
import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MedicationReminderService {

    private final MedicationReminderRepository reminderRepository;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    public MedicationReminderService(MedicationReminderRepository reminderRepository,
                                     MedicationRepository medicationRepository,
                                     UserRepository userRepository) {
        this.reminderRepository = reminderRepository;
        this.medicationRepository = medicationRepository;
        this.userRepository = userRepository;
    }

    public MedicationReminder create(UUID userId, UUID medicationId, ReminderRequest req) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        MedicationReminder reminder = new MedicationReminder();
        reminder.setMedication(medication);
        reminder.setUser(user);
        reminder.setReminderTime(req.reminderTime());
        return reminderRepository.save(reminder);
    }

    public MedicationReminder toggle(UUID userId, UUID reminderId) {
        MedicationReminder reminder = findOwned(userId, reminderId);
        reminder.setActive(!reminder.isActive());
        return reminderRepository.save(reminder);
    }

    public void delete(UUID userId, UUID reminderId) {
        MedicationReminder reminder = findOwned(userId, reminderId);
        reminderRepository.delete(reminder);
    }

    @Transactional(readOnly = true)
    public List<MedicationReminder> findByMedicationId(UUID userId, UUID medicationId) {
        return reminderRepository.findByMedicationId(medicationId);
    }

    private MedicationReminder findOwned(UUID userId, UUID reminderId) {
        MedicationReminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new IllegalArgumentException("Reminder not found"));
        if (!reminder.getUser().getId().equals(userId)) throw new SecurityException("Access denied");
        return reminder;
    }
}
```

- [ ] **Step 6: Create `MedicationReminderController.java`**

```java
package com.medhistory.reminder;

import com.medhistory.auth.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medications/{medicationId}/reminders")
public class MedicationReminderController {

    private final MedicationReminderService reminderService;

    public MedicationReminderController(MedicationReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> list(@PathVariable UUID medicationId) {
        return ResponseEntity.ok(reminderService.findByMedicationId(currentUserId(), medicationId)
                .stream().map(ReminderResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<ReminderResponse> create(@PathVariable UUID medicationId,
                                                   @Valid @RequestBody ReminderRequest req) {
        return ResponseEntity.status(201)
                .body(ReminderResponse.from(reminderService.create(currentUserId(), medicationId, req)));
    }

    @PutMapping("/{reminderId}/toggle")
    public ResponseEntity<ReminderResponse> toggle(@PathVariable UUID medicationId,
                                                   @PathVariable UUID reminderId) {
        return ResponseEntity.ok(ReminderResponse.from(reminderService.toggle(currentUserId(), reminderId)));
    }

    @DeleteMapping("/{reminderId}")
    public ResponseEntity<Void> delete(@PathVariable UUID medicationId, @PathVariable UUID reminderId) {
        reminderService.delete(currentUserId(), reminderId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
```

- [ ] **Step 7: Create `ReminderScheduler.java`**

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
import java.time.ZoneOffset;
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

    @Scheduled(fixedDelay = 60_000)   // every 60 seconds
    @Transactional
    public void fireReminders() {
        LocalTime now = LocalTime.now(ZoneOffset.UTC).withSecond(0).withNano(0);
        List<MedicationReminder> due = reminderRepository.findDueReminders(now);

        for (MedicationReminder reminder : due) {
            try {
                String medName = reminder.getMedication().getName();
                pushService.sendToUser(reminder.getUser().getId(),
                        "Medication Reminder",
                        "Time to take: " + medName);
                reminder.setLastSentAt(Instant.now());
                reminderRepository.save(reminder);
                meterRegistry.counter("medhistory.reminders.sent").increment();
            } catch (Exception e) {
                log.error("Failed to send reminder id={}: {}", reminder.getId(), e.getMessage());
            }
        }
    }
}
```

- [ ] **Step 8: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 9: Commit**

```bash
git add src/main/java/com/medhistory/reminder/
git commit -m "feat: add MedicationReminder entity, CRUD, and scheduler"
```

---

## Task 7: Web Push Service + Controller (TDD)

**Files:**
- Create: `src/main/java/com/medhistory/push/PushSubscription.java`
- Create: `src/main/java/com/medhistory/push/PushSubscriptionRepository.java`
- Create: `src/main/java/com/medhistory/push/PushService.java`
- Create: `src/main/java/com/medhistory/push/PushController.java`
- Create: `src/main/java/com/medhistory/push/PushSubscriptionRequest.java`
- Create: `src/test/java/com/medhistory/push/PushServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `src/test/java/com/medhistory/push/PushServiceTest.java`:

```java
package com.medhistory.push;

import com.medhistory.user.User;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushAsyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PushServiceTest {

    @Mock private PushSubscriptionRepository subscriptionRepository;
    @Mock private PushAsyncService pushAsyncService;
    private PushService pushService;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        pushService = new PushService(subscriptionRepository, pushAsyncService);
    }

    @Test
    void sendToUser_sendsToAllSubscriptions() throws Exception {
        PushSubscription sub = new PushSubscription();
        sub.setEndpoint("https://fcm.googleapis.com/test");
        sub.setP256dh("dGVzdA==");  // 'test' base64
        sub.setAuth("dGVzdA==");

        User user = new User();
        user.setId(userId);
        sub.setUser(user);

        when(subscriptionRepository.findByUserId(userId)).thenReturn(List.of(sub));
        when(pushAsyncService.send(any(Notification.class))).thenReturn(null);

        pushService.sendToUser(userId, "Title", "Body");

        verify(pushAsyncService, times(1)).send(any(Notification.class));
    }

    @Test
    void sendToUser_skipsWhenNoSubscriptions() throws Exception {
        when(subscriptionRepository.findByUserId(userId)).thenReturn(List.of());
        pushService.sendToUser(userId, "Title", "Body");
        verify(pushAsyncService, never()).send(any());
    }
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
mvn test -Dtest=PushServiceTest -q 2>&1 | tail -5
```

Expected: compilation failure.

- [ ] **Step 3: Create `PushSubscription.java` (entity)**

```java
package com.medhistory.push;

import com.medhistory.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, columnDefinition = "text")
    private String endpoint;

    @Column(nullable = false)
    private String p256dh;

    @Column(nullable = false)
    private String auth;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
}
```

- [ ] **Step 4: Create `PushSubscriptionRepository.java`**

```java
package com.medhistory.push;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {
    List<PushSubscription> findByUserId(UUID userId);
    Optional<PushSubscription> findByEndpoint(String endpoint);
}
```

- [ ] **Step 5: Create `PushSubscriptionRequest.java`**

```java
package com.medhistory.push;

import jakarta.validation.constraints.NotBlank;

public record PushSubscriptionRequest(
        @NotBlank String endpoint,
        @NotBlank String p256dh,
        @NotBlank String auth
) {}
```

- [ ] **Step 6: Create `PushService.java`**

```java
package com.medhistory.push;

import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushAsyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushAsyncService pushAsyncService;

    public PushService(PushSubscriptionRepository subscriptionRepository,
                       PushAsyncService pushAsyncService) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushAsyncService = pushAsyncService;
    }

    public void sendToUser(UUID userId, String title, String body) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);
        String payload = "{\"title\":\"" + title + "\",\"body\":\"" + body + "\"}";

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload.getBytes()
                );
                pushAsyncService.send(notification);
            } catch (Exception e) {
                log.error("Failed to push to endpoint {}: {}", sub.getEndpoint(), e.getMessage());
            }
        }
    }
}
```

- [ ] **Step 7: Create a Spring config bean for `PushAsyncService`**

Create `src/main/java/com/medhistory/config/PushConfig.java`:

```java
package com.medhistory.config;

import nl.martijndwars.webpush.PushAsyncService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.Security;

@Configuration
public class PushConfig {

    @Value("${app.vapid.public-key}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key}")
    private String vapidPrivateKey;

    @Bean
    public PushAsyncService pushAsyncService() throws Exception {
        Security.addProvider(new BouncyCastleProvider());
        return new PushAsyncService(vapidPublicKey, vapidPrivateKey);
    }
}
```

- [ ] **Step 8: Create `PushController.java`**

```java
package com.medhistory.push;

import com.medhistory.auth.SecurityUtils;
import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final String vapidPublicKey;

    public PushController(PushSubscriptionRepository subscriptionRepository,
                          UserRepository userRepository,
                          @Value("${app.vapid.public-key}") String vapidPublicKey) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.vapidPublicKey = vapidPublicKey;
    }

    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@Valid @RequestBody PushSubscriptionRequest req) {
        UUID userId = currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        PushSubscription sub = subscriptionRepository.findByEndpoint(req.endpoint())
                .orElse(new PushSubscription());
        sub.setUser(user);
        sub.setEndpoint(req.endpoint());
        sub.setP256dh(req.p256dh());
        sub.setAuth(req.auth());
        subscriptionRepository.save(sub);

        return ResponseEntity.status(201).build();
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        subscriptionRepository.findByEndpoint(endpoint)
                .ifPresent(subscriptionRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
```

- [ ] **Step 9: Run the tests**

```bash
mvn test -Dtest=PushServiceTest -q 2>&1 | tail -5
```

Expected: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0`

- [ ] **Step 10: Commit**

```bash
git add src/main/java/com/medhistory/push/ \
  src/main/java/com/medhistory/config/PushConfig.java \
  src/test/java/com/medhistory/push/
git commit -m "feat: add Web Push VAPID service and subscribe/unsubscribe endpoints (TDD)"
```

---

## Task 8: Global Exception Handler

**Files:**
- Create: `src/main/java/com/medhistory/common/GlobalExceptionHandler.java`

- [ ] **Step 1: Create `GlobalExceptionHandler.java`**

```java
package com.medhistory.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurity(SecurityException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return error(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "message", message,
                "timestamp", Instant.now().toString()
        ));
    }
}
```

- [ ] **Step 2: Compile and run all tests**

```bash
mvn test -q 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/medhistory/common/GlobalExceptionHandler.java
git commit -m "feat: add global exception handler for consistent API error responses"
```

---

## Task 9: End-to-End Smoke Test (Backend)

- [ ] **Step 1: Ensure Docker Compose is running**

```bash
docker compose ps
```

Expected: both services `healthy`.

- [ ] **Step 2: Start the backend**

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local 2>&1 | grep -E "Started|ERROR" | head -5
```

Expected: `Started MedhistoryApplication`

- [ ] **Step 3: Sign in via Google OAuth (manual)**

Open a browser and navigate to `http://localhost:8080/oauth2/authorization/google`. Complete the sign-in. You should be redirected to `http://localhost:5173/` (the frontend, which isn't built yet — a 404 is fine here). The `medhistory-token` cookie is now set.

- [ ] **Step 4: Test the API with the cookie**

```bash
# Extract the cookie from browser devtools and set it here:
TOKEN_COOKIE="medhistory-token=<paste-token-here>"

curl -s -H "Cookie: $TOKEN_COOKIE" http://localhost:8080/api/users/me | python3 -m json.tool
```

Expected: your Google profile JSON (`id`, `email`, `name`).

- [ ] **Step 5: Create a visit**

```bash
curl -s -X POST http://localhost:8080/api/visits \
  -H "Cookie: $TOKEN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"visitDate":"2026-04-10","doctorName":"Dr Sharma","specialty":"GP","diagnosis":"Viral fever"}' \
  | python3 -m json.tool
```

Expected: visit JSON with `id`.

- [ ] **Step 6: Run full test suite**

```bash
mvn test -q 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 7: Commit smoke test notes**

```bash
git add docs/superpowers/plans/2026-04-12-plan-2-backend-features.md
git commit -m "chore: mark Plan 2 smoke test complete"
```

---

## Done ✓

Plan 2 is complete when:
- All 7 feature modules compile and their unit tests pass
- Manual smoke test: create a visit, add a medication, add a recommendation, upload a file, create a reminder
- `GET /api/visits/search?q=fever` returns results after creating a visit with `"Viral fever"` diagnosis
- `GET /api/visits/{id}/attachments/{attId}/url` returns a presigned URL that loads the file in the browser
- `mvn test` shows 0 failures

**Next:** Implement [Plan 3 — Frontend](2026-04-12-plan-3-frontend.md)
