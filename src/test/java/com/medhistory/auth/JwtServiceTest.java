package com.medhistory.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;
    private static final String SECRET = "test-secret-that-is-at-least-32-characters-long-for-hs256-algorithm";
    private static final long EXPIRATION_MS = 86400000L;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
    }

    @Test
    void generateToken_returnsNonBlankString() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId);
        assertThat(token).isNotBlank();
    }

    @Test
    void extractUserId_returnsOriginalUserId() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId);
        UUID extracted = jwtService.extractUserId(token);
        assertThat(extracted).isEqualTo(userId);
    }

    @Test
    void isValid_returnsTrueForFreshToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId);
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void isValid_returnsFalseForTamperedToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId) + "tampered";
        assertThat(jwtService.isValid(token)).isFalse();
    }

    @Test
    void isValid_returnsFalseForExpiredToken() {
        JwtService shortLived = new JwtService(SECRET, -1L); // already expired
        UUID userId = UUID.randomUUID();
        String token = shortLived.generateToken(userId);
        assertThat(shortLived.isValid(token)).isFalse();
    }
}
