package com.medhistory.reminder;

import com.medhistory.medication.Medication;
import com.medhistory.medication.MedicationRepository;
import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MedicationReminderService {

    private final MedicationReminderRepository reminderRepository;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    public MedicationReminderService(MedicationReminderRepository reminderRepository,
                                     MedicationRepository medicationRepository,
                                     UserRepository userRepository) {
        this.reminderRepository = reminderRepository;
        this.medicationRepository = medicationRepository;
        this.userRepository = userRepository;
    }

    public ReminderResponse create(UUID userId, ReminderRequest req) {
        Medication medication = medicationRepository.findById(req.medicationId())
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        MedicationReminder reminder = new MedicationReminder();
        reminder.setMedication(medication);
        reminder.setUser(user);
        reminder.setReminderTime(req.reminderTime());
        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    public ReminderResponse toggle(UUID userId, UUID reminderId) {
        MedicationReminder reminder = findOwned(userId, reminderId);
        reminder.setActive(!reminder.isActive());
        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    public void delete(UUID userId, UUID reminderId) {
        MedicationReminder reminder = findOwned(userId, reminderId);
        reminderRepository.delete(reminder);
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> findByUserId(UUID userId) {
        return reminderRepository.findByUserId(userId)
                .stream().map(ReminderResponse::from).toList();
    }

    private MedicationReminder findOwned(UUID userId, UUID reminderId) {
        MedicationReminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new IllegalArgumentException("Reminder not found"));
        if (!reminder.getUser().getId().equals(userId)) throw new SecurityException("Access denied");
        return reminder;
    }
}
