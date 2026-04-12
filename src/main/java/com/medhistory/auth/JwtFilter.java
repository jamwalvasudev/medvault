package com.medhistory.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "medhistory-token";
    private final JwtService jwtService;

    public JwtFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        extractToken(request)
                .filter(jwtService::isValid)
                .ifPresent(token -> {
                    UUID userId = jwtService.extractUserId(token);
                    MDC.put("userId", userId.toString());
                    var auth = new UsernamePasswordAuthenticationToken(
                            userId.toString(),
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
        chain.doFilter(request, response);
        MDC.remove("userId");
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        if (request.getCookies() == null) return Optional.empty();
        return Arrays.stream(request.getCookies())
                .filter(c -> COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }
}
