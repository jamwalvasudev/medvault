package com.medhistory.visit;

import java.time.LocalDate;
import java.util.UUID;

public record VisitResponse(
        UUID id,
        LocalDate visitDate,
        String doctorName,
        String specialty,
        String clinic,
        String chiefComplaint,
        String diagnosis,
        String notes
) {
    public static VisitResponse from(Visit visit) {
        return new VisitResponse(
                visit.getId(),
                visit.getVisitDate(),
                visit.getDoctorName(),
                visit.getSpecialty(),
                visit.getClinic(),
                visit.getChiefComplaint(),
                visit.getDiagnosis(),
                visit.getNotes()
        );
    }
}
