package com.medhistory.specialty;

public record SpecialtyResponse(Integer id, String name) {
    public static SpecialtyResponse from(Specialty s) {
        return new SpecialtyResponse(s.getId(), s.getName());
    }
}
