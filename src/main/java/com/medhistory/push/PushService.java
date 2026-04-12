package com.medhistory.push;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushAsyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushAsyncService pushAsyncService;
    private final ObjectMapper objectMapper;

    public PushService(PushSubscriptionRepository subscriptionRepository,
                       PushAsyncService pushAsyncService,
                       ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushAsyncService = pushAsyncService;
        this.objectMapper = objectMapper;
    }

    public void sendToUser(UUID userId, String title, String body) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);

        byte[] payload;
        try {
            payload = objectMapper.writeValueAsBytes(Map.of("title", title, "body", body));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize push payload: {}", e.getMessage());
            return;
        }

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload
                );
                pushAsyncService.send(notification);
            } catch (Exception e) {
                log.error("Failed to push to endpoint {}: {}", sub.getEndpoint(), e.getMessage());
            }
        }
    }
}
