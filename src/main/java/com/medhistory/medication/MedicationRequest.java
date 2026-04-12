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
