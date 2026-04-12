package com.medhistory.push;

import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushAsyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushAsyncService pushAsyncService;

    public PushService(PushSubscriptionRepository subscriptionRepository,
                       PushAsyncService pushAsyncService) {
        this.subscriptionRepository = subscriptionRepository;
        this.pushAsyncService = pushAsyncService;
    }

    public void sendToUser(UUID userId, String title, String body) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);
        String payload = "{\"title\":\"" + title + "\",\"body\":\"" + body + "\"}";

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload.getBytes()
                );
                pushAsyncService.send(notification);
            } catch (Exception e) {
                log.error("Failed to push to endpoint {}: {}", sub.getEndpoint(), e.getMessage());
            }
        }
    }
}
