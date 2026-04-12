package com.medhistory.attachment;

import com.medhistory.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits/{visitId}/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> list(@PathVariable UUID visitId) {
        return ResponseEntity.ok(attachmentService.findByVisitId(currentUserId(), visitId)
                .stream().map(AttachmentResponse::from).toList());
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<AttachmentResponse> upload(
            @PathVariable UUID visitId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "fileType", defaultValue = "other") String fileType) {
        Attachment attachment = attachmentService.upload(currentUserId(), visitId, file, fileType);
        return ResponseEntity.status(201).body(AttachmentResponse.from(attachment));
    }

    @GetMapping("/{attachmentId}/url")
    public ResponseEntity<Map<String, String>> presignedUrl(@PathVariable UUID visitId,
                                                            @PathVariable UUID attachmentId) {
        String url = attachmentService.generatePresignedUrl(currentUserId(), attachmentId);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID visitId, @PathVariable UUID attachmentId) {
        attachmentService.delete(currentUserId(), attachmentId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return SecurityUtils.getCurrentUserId().orElseThrow(() -> new SecurityException("Not authenticated"));
    }
}
