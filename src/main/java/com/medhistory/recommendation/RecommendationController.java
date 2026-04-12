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
