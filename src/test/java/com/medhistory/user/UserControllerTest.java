package com.medhistory.user;

import com.medhistory.auth.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean UserService userService;
    @MockBean JwtService jwtService;

    @Test
    @WithMockUser(username = "00000000-0000-0000-0000-000000000001")
    void getMe_returnsCurrentUser() throws Exception {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        User user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setName("Test User");

        when(userService.getById(userId)).thenReturn(user);

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"));
    }

    @Test
    void getMe_returns401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }
}
