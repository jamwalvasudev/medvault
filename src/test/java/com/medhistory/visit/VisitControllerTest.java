package com.medhistory.visit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medhistory.auth.JwtService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VisitController.class)
@ActiveProfiles("test")
class VisitControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean VisitService visitService;
    @MockBean JwtService jwtService;
    @MockBean MeterRegistry meterRegistry;

    private static final String USER_ID = "00000000-0000-0000-0000-000000000001";

    @BeforeEach
    void setUp() {
        when(meterRegistry.counter(any(String.class), any(String[].class))).thenReturn(mock(Counter.class));
    }

    @Test
    @WithMockUser(username = USER_ID)
    void listVisits_returns200WithPage() throws Exception {
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setVisitDate(LocalDate.now());
        when(visitService.list(eq(UUID.fromString(USER_ID)), any()))
                .thenReturn(new PageImpl<>(List.of(visit)));

        mockMvc.perform(get("/api/visits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].visitDate").isNotEmpty());
    }

    @Test
    @WithMockUser(username = USER_ID)
    void createVisit_returns201WithVisit() throws Exception {
        VisitRequest req = new VisitRequest(LocalDate.now(), "Dr Jones", null, null, null, null, null);
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setVisitDate(req.visitDate());
        visit.setDoctorName(req.doctorName());

        when(visitService.create(eq(UUID.fromString(USER_ID)), any())).thenReturn(visit);

        mockMvc.perform(post("/api/visits")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.doctorName").value("Dr Jones"));
    }

    @Test
    @WithMockUser(username = USER_ID)
    void searchVisits_returns200WithResults() throws Exception {
        Visit visit = new Visit();
        visit.setId(UUID.randomUUID());
        visit.setDiagnosis("Pharyngitis");
        when(visitService.search(eq(UUID.fromString(USER_ID)), eq("throat")))
                .thenReturn(List.of(visit));

        mockMvc.perform(get("/api/visits/search").param("q", "throat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].diagnosis").value("Pharyngitis"));
    }

    @Test
    void listVisits_returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/visits"))
                .andExpect(status().isUnauthorized());
    }
}
