package com.medhistory.recommendation;

import java.util.UUID;

public record RecommendationResponse(UUID id, UUID visitId, String type, String description) {
    public static RecommendationResponse from(Recommendation r) {
        return new RecommendationResponse(r.getId(), r.getVisit().getId(), r.getType(), r.getDescription());
    }
}
