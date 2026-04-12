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
