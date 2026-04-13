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
import java.time.ZoneId;
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
        Instant now = Instant.now();
        List<MedicationReminder> active = reminderRepository.findAllActive();

        for (MedicationReminder reminder : active) {
            try {
                String tz = reminder.getUser().getTimezone();
                ZoneId zone = resolveZone(tz);
                LocalTime localNow = LocalTime.ofInstant(now, zone);
                LocalTime rt = reminder.getReminderTime();

                if (localNow.getHour() == rt.getHour() && localNow.getMinute() == rt.getMinute()) {
                    String medName = reminder.getMedication().getName();
                    pushService.sendToUser(reminder.getUser().getId(),
                            "Medication Reminder",
                            "Time to take: " + medName);
                    reminder.setLastSentAt(now);
                    reminderRepository.save(reminder);
                    meterRegistry.counter("medhistory.reminders.sent").increment();
                }
            } catch (Exception e) {
                log.error("Failed to process reminder id={}: {}", reminder.getId(), e.getMessage());
            }
        }
    }

    private ZoneId resolveZone(String tz) {
        if (tz == null || tz.isBlank()) return ZoneId.of("UTC");
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            log.warn("Invalid timezone '{}', falling back to UTC", tz);
            return ZoneId.of("UTC");
        }
    }
}
