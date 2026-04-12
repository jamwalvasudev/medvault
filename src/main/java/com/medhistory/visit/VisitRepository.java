package com.medhistory.visit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface VisitRepository extends JpaRepository<Visit, UUID> {

    Page<Visit> findByUserIdOrderByVisitDateDesc(UUID userId, Pageable pageable);

    default Page<Visit> findByUserId(UUID userId, Pageable pageable) {
        return findByUserIdOrderByVisitDateDesc(userId, pageable);
    }

    @Query(value = """
            SELECT v.* FROM visits v
            WHERE v.user_id = :userId
              AND v.search_vector @@ plainto_tsquery('english', :query)
            ORDER BY ts_rank(v.search_vector, plainto_tsquery('english', :query)) DESC
            """, nativeQuery = true)
    List<Visit> search(@Param("userId") UUID userId, @Param("query") String query);

    @Modifying
    @Query(value = """
            UPDATE visits SET search_vector = to_tsvector('english',
                coalesce(doctor_name,'') || ' ' ||
                coalesce(specialty,'') || ' ' ||
                coalesce(diagnosis,'') || ' ' ||
                coalesce(chief_complaint,'') || ' ' ||
                coalesce(notes,'') || ' ' ||
                coalesce((SELECT string_agg(m.name,' ') FROM medications m WHERE m.visit_id = visits.id),'') || ' ' ||
                coalesce((SELECT string_agg(r.description,' ') FROM recommendations r WHERE r.visit_id = visits.id),'')
            )
            WHERE id = :visitId
            """, nativeQuery = true)
    void refreshSearchVector(@Param("visitId") UUID visitId);
}
