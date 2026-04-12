package com.medhistory.recommendation;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.visit.Visit;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

@Entity
@Table(name = "recommendations")
@Audited
public class Recommendation extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "text", nullable = false)
    private String description;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Visit getVisit() { return visit; }
    public void setVisit(Visit visit) { this.visit = visit; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
