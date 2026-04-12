package com.medhistory.auth;

import com.medhistory.user.User;
import com.medhistory.user.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserService userService;
    private final JwtService jwtService;
    private final String frontendUrl;
    private final int cookieMaxAgeSeconds;

    public OAuth2SuccessHandler(UserService userService,
                                JwtService jwtService,
                                @Value("${app.frontend.url}") String frontendUrl,
                                @Value("${app.jwt.expiration-ms}") long jwtExpirationMs) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.frontendUrl = frontendUrl;
        this.cookieMaxAgeSeconds = (int) (jwtExpirationMs / 1000);
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        User user = userService.upsertFromOAuth2(
                oidcUser.getSubject(),
                oidcUser.getEmail(),
                oidcUser.getFullName(),
                oidcUser.getPicture()
        );

        String token = jwtService.generateToken(user.getId());

        Cookie cookie = new Cookie("medhistory-token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(cookieMaxAgeSeconds); // matches app.jwt.expiration-ms
        // cookie.setSecure(true); — enabled in prod via SecurityConfig (https-only deployment)
        response.addCookie(cookie);

        response.sendRedirect(frontendUrl + "/");
    }
}
