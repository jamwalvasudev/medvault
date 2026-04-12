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
