package com.medhistory.medication;

import com.medhistory.auth.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits/{visitId}/medications")
public class MedicationController {

    private final MedicationService medicationService;

    public MedicationController(MedicationService medicationService) {
        this.medicationService = medicationService;
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> list(@PathVariable UUID visitId) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(medicationService.findByVisitId(userId, visitId)
                .stream().map(MedicationResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<MedicationResponse> create(@PathVariable UUID visitId,
                                                     @Valid @RequestBody MedicationRequest req) {
        UUID userId = currentUserId();
        return ResponseEntity.status(201)
                .body(MedicationResponse.from(medicationService.create(userId, visitId, req)));
    }

    @PutMapping("/{medicationId}")
    public ResponseEntity<MedicationResponse> update(@PathVariable UUID visitId,
                                                     @PathVariable UUID medicationId,
                                                     @Valid @RequestBody MedicationRequest req) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(MedicationResponse.from(
                medicationService.update(userId, visitId, medicationId, req)));
    }

    @DeleteMapping("/{medicationId}")
    public ResponseEntity<Void> delete(@PathVariable UUID visitId,
                                       @PathVariable UUID medicationId) {
        medicationService.delete(currentUserId(), visitId, medicationId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
