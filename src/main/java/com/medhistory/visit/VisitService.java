package com.medhistory.visit;

import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class VisitService {

    private final VisitRepository visitRepository;
    private final UserRepository userRepository;

    public VisitService(VisitRepository visitRepository, UserRepository userRepository) {
        this.visitRepository = visitRepository;
        this.userRepository = userRepository;
    }

    public Visit create(UUID userId, VisitRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Visit visit = new Visit();
        visit.setUser(user);
        applyRequest(visit, req);
        return visitRepository.save(visit);
    }

    @Transactional(readOnly = true)
    public Page<Visit> list(UUID userId, Pageable pageable) {
        return visitRepository.findByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Visit getById(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new EntityNotFoundException("Visit not found"));
        assertOwner(userId, visit);
        return visit;
    }

    public Visit update(UUID userId, UUID visitId, VisitRequest req) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new EntityNotFoundException("Visit not found"));
        assertOwner(userId, visit);
        applyRequest(visit, req);
        return visitRepository.save(visit);
    }

    public void delete(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new EntityNotFoundException("Visit not found"));
        assertOwner(userId, visit);
        visitRepository.delete(visit);
    }

    @Transactional(readOnly = true)
    public List<Visit> search(UUID userId, String query) {
        return visitRepository.search(userId, query);
    }

    public void refreshSearchVector(UUID visitId) {
        visitRepository.refreshSearchVector(visitId);
    }

    private void applyRequest(Visit visit, VisitRequest req) {
        visit.setVisitDate(req.visitDate());
        visit.setDoctorName(req.doctorName());
        visit.setSpecialty(req.specialty());
        visit.setClinic(req.clinic());
        visit.setChiefComplaint(req.chiefComplaint());
        visit.setDiagnosis(req.diagnosis());
        visit.setNotes(req.notes());
    }

    private void assertOwner(UUID userId, Visit visit) {
        if (!visit.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
    }
}
