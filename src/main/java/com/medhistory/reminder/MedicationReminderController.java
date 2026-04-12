package com.medhistory.reminder;

import com.medhistory.auth.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medications/{medicationId}/reminders")
public class MedicationReminderController {

    private final MedicationReminderService reminderService;

    public MedicationReminderController(MedicationReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> list(@PathVariable UUID medicationId) {
        return ResponseEntity.ok(reminderService.findByMedicationId(currentUserId(), medicationId)
                .stream().map(ReminderResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<ReminderResponse> create(@PathVariable UUID medicationId,
                                                   @Valid @RequestBody ReminderRequest req) {
        return ResponseEntity.status(201)
                .body(ReminderResponse.from(reminderService.create(currentUserId(), medicationId, req)));
    }

    @PutMapping("/{reminderId}/toggle")
    public ResponseEntity<ReminderResponse> toggle(@PathVariable UUID medicationId,
                                                   @PathVariable UUID reminderId) {
        return ResponseEntity.ok(ReminderResponse.from(reminderService.toggle(currentUserId(), reminderId)));
    }

    @DeleteMapping("/{reminderId}")
    public ResponseEntity<Void> delete(@PathVariable UUID medicationId, @PathVariable UUID reminderId) {
        reminderService.delete(currentUserId(), reminderId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
