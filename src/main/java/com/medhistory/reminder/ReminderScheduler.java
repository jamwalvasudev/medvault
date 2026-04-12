package com.medhistory.reminder;

import com.medhistory.push.PushService;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;

@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final MedicationReminderRepository reminderRepository;
    private final PushService pushService;
    private final MeterRegistry meterRegistry;

    public ReminderScheduler(MedicationReminderRepository reminderRepository,
                             PushService pushService,
                             MeterRegistry meterRegistry) {
        this.reminderRepository = reminderRepository;
        this.pushService = pushService;
        this.meterRegistry = meterRegistry;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void fireReminders() {
        LocalTime now = LocalTime.now(ZoneOffset.UTC).withSecond(0).withNano(0);
        List<MedicationReminder> due = reminderRepository.findDueReminders(now);

        for (MedicationReminder reminder : due) {
            try {
                String medName = reminder.getMedication().getName();
                pushService.sendToUser(reminder.getUser().getId(),
                        "Medication Reminder",
                        "Time to take: " + medName);
                reminder.setLastSentAt(Instant.now());
                reminderRepository.save(reminder);
                meterRegistry.counter("medhistory.reminders.sent").increment();
            } catch (Exception e) {
                log.error("Failed to send reminder id={}: {}", reminder.getId(), e.getMessage());
            }
        }
    }
}
