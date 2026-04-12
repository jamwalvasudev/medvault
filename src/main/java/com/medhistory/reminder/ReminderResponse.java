package com.medhistory.reminder;

import java.time.LocalTime;
import java.util.UUID;

public record ReminderResponse(UUID id, UUID medicationId, LocalTime reminderTime, boolean active) {
    public static ReminderResponse from(MedicationReminder r) {
        return new ReminderResponse(r.getId(), r.getMedication().getId(), r.getReminderTime(), r.isActive());
    }
}
