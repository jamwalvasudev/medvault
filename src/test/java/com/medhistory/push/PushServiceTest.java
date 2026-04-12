package com.medhistory.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medhistory.user.User;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushAsyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.security.Security;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PushServiceTest {

    @Mock private PushSubscriptionRepository subscriptionRepository;
    @Mock private PushAsyncService pushAsyncService;
    private PushService pushService;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        pushService = new PushService(subscriptionRepository, pushAsyncService, new ObjectMapper());
    }

    @Test
    void sendToUser_sendsToAllSubscriptions() throws Exception {
        PushSubscription sub = new PushSubscription();
        sub.setEndpoint("https://fcm.googleapis.com/test");
        // Valid P-256 uncompressed public key (65 bytes, base64url) and 16-byte auth secret
        sub.setP256dh("BA__7OzHyrtgV459WUvjX401gFI2zCoJzF_nffgLHKFOZHPcw_TmVa_H3kEH8MU30xSmP7aaRWrtewwmYD2ei54");
        sub.setAuth("xnlyV_a7S9f46z6LFtBpAg");

        User user = new User();
        user.setId(userId);
        sub.setUser(user);

        when(subscriptionRepository.findByUserId(userId)).thenReturn(List.of(sub));
        when(pushAsyncService.send(any(Notification.class))).thenReturn(null);

        pushService.sendToUser(userId, "Title", "Body");

        verify(pushAsyncService, times(1)).send(any(Notification.class));
    }

    @Test
    void sendToUser_skipsWhenNoSubscriptions() throws Exception {
        when(subscriptionRepository.findByUserId(userId)).thenReturn(List.of());
        pushService.sendToUser(userId, "Title", "Body");
        verify(pushAsyncService, never()).send(any());
    }
}
