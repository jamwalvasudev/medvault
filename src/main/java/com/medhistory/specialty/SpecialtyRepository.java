package com.medhistory.specialty;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpecialtyRepository extends JpaRepository<Specialty, Integer> {
    List<Specialty> findAllByOrderBySortOrderAsc();
}
