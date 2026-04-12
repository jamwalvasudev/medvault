package com.medhistory.visit;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record VisitRequest(
        @NotNull LocalDate visitDate,
        String doctorName,
        String specialty,
        String clinic,
        String chiefComplaint,
        String diagnosis,
        String notes
) {}
