package com.medhistory.reminder;

import java.util.UUID;

public record ReminderResponse(UUID id, UUID medicationId, String medicationName, String reminderTime, boolean enabled) {
    public static ReminderResponse from(MedicationReminder r) {
        return new ReminderResponse(
                r.getId(),
                r.getMedication().getId(),
                r.getMedication().getName(),
                r.getReminderTime().toString(),
                r.isActive()
        );
    }
}
