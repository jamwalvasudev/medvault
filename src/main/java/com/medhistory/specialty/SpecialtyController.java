package com.medhistory.specialty;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/specialties")
public class SpecialtyController {

    private final SpecialtyRepository specialtyRepository;

    public SpecialtyController(SpecialtyRepository specialtyRepository) {
        this.specialtyRepository = specialtyRepository;
    }

    @GetMapping
    public ResponseEntity<List<SpecialtyResponse>> list() {
        return ResponseEntity.ok(
                specialtyRepository.findAllByOrderBySortOrderAsc()
                        .stream().map(SpecialtyResponse::from).toList()
        );
    }
}
