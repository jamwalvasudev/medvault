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
