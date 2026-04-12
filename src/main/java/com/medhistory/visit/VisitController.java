package com.medhistory.visit;

import com.medhistory.auth.SecurityUtils;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits")
public class VisitController {

    private final VisitService visitService;
    private final MeterRegistry meterRegistry;

    public VisitController(VisitService visitService, MeterRegistry meterRegistry) {
        this.visitService = visitService;
        this.meterRegistry = meterRegistry;
    }

    @GetMapping
    public ResponseEntity<Page<VisitSummary>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = currentUserId();
        Page<VisitSummary> result = visitService.list(userId, PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "visitDate")))
                .map(VisitSummary::from);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<VisitResponse> create(@Valid @RequestBody VisitRequest req) {
        UUID userId = currentUserId();
        Visit visit = visitService.create(userId, req);
        meterRegistry.counter("medhistory.visits.created").increment();
        return ResponseEntity.status(201).body(VisitResponse.from(visit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VisitResponse> get(@PathVariable UUID id) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(VisitResponse.from(visitService.getById(userId, id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VisitResponse> update(@PathVariable UUID id,
                                                @Valid @RequestBody VisitRequest req) {
        UUID userId = currentUserId();
        Visit visit = visitService.update(userId, id, req);
        return ResponseEntity.ok(VisitResponse.from(visit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        visitService.delete(currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<VisitSummary>> search(@RequestParam String q) {
        UUID userId = currentUserId();
        List<VisitSummary> results = visitService.search(userId, q)
                .stream().map(VisitSummary::from).toList();
        return ResponseEntity.ok(results);
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
