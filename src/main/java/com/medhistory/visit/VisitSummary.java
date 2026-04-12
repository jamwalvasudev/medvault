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
                0,
                0
        );
    }
}
