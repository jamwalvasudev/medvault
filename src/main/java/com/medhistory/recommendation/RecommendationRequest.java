package com.medhistory.recommendation;

import jakarta.validation.constraints.NotBlank;

public record RecommendationRequest(
        @NotBlank String type,
        @NotBlank String description
) {}
