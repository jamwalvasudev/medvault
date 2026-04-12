package com.medhistory.attachment;

import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final VisitRepository visitRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final MeterRegistry meterRegistry;

    public AttachmentService(AttachmentRepository attachmentRepository,
                             VisitRepository visitRepository,
                             S3Client s3Client,
                             S3Presigner s3Presigner,
                             @Value("${app.storage.bucket}") String bucket,
                             MeterRegistry meterRegistry) {
        this.attachmentRepository = attachmentRepository;
        this.visitRepository = visitRepository;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucket = bucket;
        this.meterRegistry = meterRegistry;
    }

    public Attachment upload(UUID userId, UUID visitId, MultipartFile file, String fileType) {
        Visit visit = requireOwnedVisit(userId, visitId);
        String key = "attachments/" + visitId + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file", e);
        }

        Attachment attachment = new Attachment();
        attachment.setVisit(visit);
        attachment.setDisplayName(file.getOriginalFilename());
        attachment.setR2Key(key);
        attachment.setFileType(fileType);
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());

        Attachment saved = attachmentRepository.save(attachment);
        meterRegistry.counter("medhistory.attachments.uploaded").increment();
        return saved;
    }

    @Transactional(readOnly = true)
    public String generatePresignedUrl(UUID userId, UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        assertOwner(userId, attachment);

        var presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(30))
                .getObjectRequest(r -> r.bucket(bucket).key(attachment.getR2Key()))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public void delete(UUID userId, UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        assertOwner(userId, attachment);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket).key(attachment.getR2Key()).build());
        attachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> findByVisitId(UUID userId, UUID visitId) {
        requireOwnedVisit(userId, visitId);
        return attachmentRepository.findByVisitId(visitId)
                .stream().map(AttachmentResponse::from).toList();
    }

    private Visit requireOwnedVisit(UUID userId, UUID visitId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getUser().getId().equals(userId)) throw new SecurityException("Access denied");
        return visit;
    }

    private void assertOwner(UUID userId, Attachment attachment) {
        if (!attachment.getVisit().getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
    }
}
