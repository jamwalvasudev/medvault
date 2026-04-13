package com.medhistory.user;

import com.medhistory.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        return SecurityUtils.getCurrentUserId()
                .map(userService::getById)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }

    @PatchMapping("/me/timezone")
    public ResponseEntity<Void> updateTimezone(@RequestBody Map<String, String> body) {
        String timezone = body.get("timezone");
        if (timezone == null || timezone.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        java.util.Optional<java.util.UUID> maybeId = SecurityUtils.getCurrentUserId();
        if (maybeId.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        userService.updateTimezone(maybeId.get(), timezone);
        return ResponseEntity.noContent().build();
    }
}
