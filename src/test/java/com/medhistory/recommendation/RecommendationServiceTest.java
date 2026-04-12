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
