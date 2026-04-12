package com.medhistory.user;

import java.util.UUID;

public record UserResponse(UUID id, String email, String name, String profilePicture) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getProfilePicture());
    }
}
