package com.medhistory.specialty;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpecialtyControllerTest {

    @Mock
    private SpecialtyRepository specialtyRepository;
    private SpecialtyController controller;

    @BeforeEach
    void setUp() {
        controller = new SpecialtyController(specialtyRepository);
    }

    @Test
    void list_returnsSpecialtiesFromRepository() {
        Specialty cardiology = new Specialty();
        cardiology.setId(3);
        cardiology.setName("Cardiology");
        cardiology.setSortOrder(3);

        Specialty dermatology = new Specialty();
        dermatology.setId(4);
        dermatology.setName("Dermatology");
        dermatology.setSortOrder(4);

        when(specialtyRepository.findAllByOrderBySortOrderAsc())
                .thenReturn(List.of(cardiology, dermatology));

        var response = controller.list();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).name()).isEqualTo("Cardiology");
        assertThat(response.getBody().get(1).name()).isEqualTo("Dermatology");
    }
}
