package com.medhistory.push;

import com.medhistory.auth.SecurityUtils;
import com.medhistory.user.User;
import com.medhistory.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final String vapidPublicKey;

    public PushController(PushSubscriptionRepository subscriptionRepository,
                          UserRepository userRepository,
                          @Value("${app.vapid.public-key}") String vapidPublicKey) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.vapidPublicKey = vapidPublicKey;
    }

    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@Valid @RequestBody PushSubscriptionRequest req) {
        UUID userId = currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        PushSubscription sub = subscriptionRepository.findByEndpoint(req.endpoint())
                .orElse(new PushSubscription());
        sub.setUser(user);
        sub.setEndpoint(req.endpoint());
        sub.setP256dh(req.p256dh());
        sub.setAuth(req.auth());
        subscriptionRepository.save(sub);

        return ResponseEntity.status(201).build();
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        subscriptionRepository.findByEndpoint(endpoint)
                .ifPresent(subscriptionRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
