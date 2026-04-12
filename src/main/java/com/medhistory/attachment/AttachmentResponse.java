package com.medhistory.attachment;

import java.util.UUID;

public record AttachmentResponse(UUID id, UUID visitId, String displayName, String fileType,
                                  String contentType, Long sizeBytes) {
    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.getId(), a.getVisit().getId(), a.getDisplayName(),
                a.getFileType(), a.getContentType(), a.getSizeBytes());
    }
}
