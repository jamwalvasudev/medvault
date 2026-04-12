package com.medhistory.reminder;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record ReminderRequest(@NotNull LocalTime reminderTime) {}
