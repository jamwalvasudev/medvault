package com.medhistory.reminder;

import com.medhistory.auth.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
public class MedicationReminderController {

    private final MedicationReminderService reminderService;

    public MedicationReminderController(MedicationReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> list() {
        return ResponseEntity.ok(reminderService.findByUserId(currentUserId()));
    }

    @PostMapping
    public ResponseEntity<ReminderResponse> create(@Valid @RequestBody ReminderRequest req) {
        return ResponseEntity.status(201).body(reminderService.create(currentUserId(), req));
    }

    @PostMapping("/{reminderId}/toggle")
    public ResponseEntity<ReminderResponse> toggle(@PathVariable UUID reminderId) {
        return ResponseEntity.ok(reminderService.toggle(currentUserId(), reminderId));
    }

    @DeleteMapping("/{reminderId}")
    public ResponseEntity<Void> delete(@PathVariable UUID reminderId) {
        reminderService.delete(currentUserId(), reminderId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
