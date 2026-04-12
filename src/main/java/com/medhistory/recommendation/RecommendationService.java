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
        if (!rec.getVisit().getId().equals(visitId)) throw new SecurityException("Access denied");
        rec.setType(req.type());
        rec.setDescription(req.description());
        Recommendation saved = recommendationRepository.save(rec);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public void delete(UUID userId, UUID visitId, UUID recId) {
        requireOwnedVisit(userId, visitId);
        Recommendation rec = recommendationRepository.findById(recId)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found"));
        if (!rec.getVisit().getId().equals(visitId)) throw new SecurityException("Access denied");
        recommendationRepository.delete(rec);
        visitService.refreshSearchVector(visitId);
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> findByVisitId(UUID userId, UUID visitId) {
        requireOwnedVisit(userId, visitId);
        return recommendationRepository.findByVisitId(visitId)
                .stream().map(RecommendationResponse::from).toList();
    }

    private Visit requireOwnedVisit(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getUser().getId().equals(userId)) throw new SecurityException("Access denied");
        return visit;
    }
}
