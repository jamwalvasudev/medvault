package com.medhistory.config;

import nl.martijndwars.webpush.PushAsyncService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.Security;

@Configuration
public class PushConfig {

    @Value("${app.vapid.public-key}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key}")
    private String vapidPrivateKey;

    @Bean
    public PushAsyncService pushAsyncService() throws Exception {
        Security.addProvider(new BouncyCastleProvider());
        return new PushAsyncService(vapidPublicKey, vapidPrivateKey);
    }
}
