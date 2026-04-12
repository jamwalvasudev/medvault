package com.medhistory.reminder;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.UUID;

public record ReminderRequest(@NotNull UUID medicationId, @NotNull LocalTime reminderTime) {}
