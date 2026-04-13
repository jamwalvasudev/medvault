package com.medhistory.reminder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MedicationReminderRepository extends JpaRepository<MedicationReminder, UUID> {

    List<MedicationReminder> findByMedicationId(UUID medicationId);

    List<MedicationReminder> findByUserId(UUID userId);

    @Query("""
            SELECT r FROM MedicationReminder r
            WHERE r.active = true
              AND HOUR(r.reminderTime) = :hour
              AND MINUTE(r.reminderTime) = :minute
            """)
    List<MedicationReminder> findDueReminders(@Param("hour") int hour, @Param("minute") int minute);

    @Query("SELECT r FROM MedicationReminder r JOIN FETCH r.user WHERE r.active = true")
    List<MedicationReminder> findAllActive();
}
