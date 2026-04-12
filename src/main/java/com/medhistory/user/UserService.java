package com.medhistory.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User upsertFromOAuth2(String googleId, String email, String name, String profilePicture) {
        User user = userRepository.findByGoogleId(googleId).orElse(new User());
        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(name);
        user.setProfilePicture(profilePicture);
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }
}
