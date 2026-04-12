package com.medhistory.reminder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface MedicationReminderRepository extends JpaRepository<MedicationReminder, UUID> {

    List<MedicationReminder> findByMedicationId(UUID medicationId);

    @Query("""
            SELECT r FROM MedicationReminder r
            WHERE r.active = true
              AND HOUR(r.reminderTime) = HOUR(:now)
              AND MINUTE(r.reminderTime) = MINUTE(:now)
            """)
    List<MedicationReminder> findDueReminders(@Param("now") LocalTime now);
}
