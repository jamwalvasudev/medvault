package com.medhistory.medication;

import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import com.medhistory.visit.VisitService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final VisitRepository visitRepository;
    private final VisitService visitService;

    public MedicationService(MedicationRepository medicationRepository,
                             VisitRepository visitRepository,
                             VisitService visitService) {
        this.medicationRepository = medicationRepository;
        this.visitRepository = visitRepository;
        this.visitService = visitService;
    }

    public Medication create(UUID userId, UUID visitId, MedicationRequest req) {
        Visit visit = requireOwnedVisit(userId, visitId);
        Medication med = new Medication();
        med.setVisit(visit);
        apply(med, req);
        Medication saved = medicationRepository.save(med);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public Medication update(UUID userId, UUID visitId, UUID medicationId, MedicationRequest req) {
        requireOwnedVisit(userId, visitId);
        Medication med = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        apply(med, req);
        Medication saved = medicationRepository.save(med);
        visitService.refreshSearchVector(visitId);
        return saved;
    }

    public void delete(UUID userId, UUID visitId, UUID medicationId) {
        requireOwnedVisit(userId, visitId);
        medicationRepository.deleteById(medicationId);
        visitService.refreshSearchVector(visitId);
    }

    @Transactional(readOnly = true)
    public List<Medication> findByVisitId(UUID userId, UUID visitId) {
        requireOwnedVisit(userId, visitId);
        return medicationRepository.findByVisitId(visitId);
    }

    @Transactional(readOnly = true)
    public Medication getById(UUID medicationId) {
        return medicationRepository.findById(medicationId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
    }

    private Visit requireOwnedVisit(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
        return visit;
    }

    private void apply(Medication med, MedicationRequest req) {
        med.setName(req.name());
        med.setDosage(req.dosage());
        med.setFrequency(req.frequency());
        med.setDurationDays(req.durationDays());
        med.setWorked(req.worked());
        med.setSideEffects(req.sideEffects());
        med.setWouldUseAgain(req.wouldUseAgain());
    }
}
