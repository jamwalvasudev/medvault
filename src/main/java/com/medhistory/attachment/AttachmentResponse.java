package com.medhistory.attachment;

import java.time.Instant;
import java.util.UUID;

public record AttachmentResponse(UUID id, UUID visitId, String filename, String fileType,
                                  String contentType, Long sizeBytes, Instant uploadedAt) {
    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.getId(), a.getVisit().getId(), a.getDisplayName(),
                a.getFileType(), a.getContentType(), a.getSizeBytes(), a.getCreatedAt());
    }
}
