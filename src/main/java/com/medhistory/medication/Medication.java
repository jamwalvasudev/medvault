package com.medhistory.medication;

import com.medhistory.common.BaseAuditEntity;
import com.medhistory.visit.Visit;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.UUID;

@Entity
@Table(name = "medications")
@Audited
public class Medication extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(nullable = false)
    private String name;

    private String dosage;
    private String frequency;

    @Column(name = "duration_days")
    private Integer durationDays;

    private String worked;

    @Column(name = "side_effects", columnDefinition = "text")
    private String sideEffects;

    @Column(name = "would_use_again")
    private Boolean wouldUseAgain;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Visit getVisit() { return visit; }
    public void setVisit(Visit visit) { this.visit = visit; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
    public String getWorked() { return worked; }
    public void setWorked(String worked) { this.worked = worked; }
    public String getSideEffects() { return sideEffects; }
    public void setSideEffects(String sideEffects) { this.sideEffects = sideEffects; }
    public Boolean getWouldUseAgain() { return wouldUseAgain; }
    public void setWouldUseAgain(Boolean wouldUseAgain) { this.wouldUseAgain = wouldUseAgain; }
}
