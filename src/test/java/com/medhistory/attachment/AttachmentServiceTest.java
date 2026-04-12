package com.medhistory.attachment;

import com.medhistory.user.User;
import com.medhistory.visit.Visit;
import com.medhistory.visit.VisitRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.net.URL;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock private AttachmentRepository attachmentRepository;
    @Mock private VisitRepository visitRepository;
    @Mock private S3Client s3Client;
    @Mock private S3Presigner s3Presigner;
    private MeterRegistry meterRegistry;
    private AttachmentService attachmentService;

    private final UUID userId = UUID.randomUUID();
    private final UUID visitId = UUID.randomUUID();
    private Visit visit;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        attachmentService = new AttachmentService(
                attachmentRepository, visitRepository, s3Client, s3Presigner,
                "medhistory", meterRegistry);
        User owner = new User();
        owner.setId(userId);
        visit = new Visit();
        visit.setId(visitId);
        visit.setUser(owner);
    }

    @Test
    void upload_savesAttachmentAndUploadsToS3() {
        when(visitRepository.findById(visitId)).thenReturn(Optional.of(visit));
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class))).thenReturn(null);
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(inv -> {
            Attachment a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "prescription.pdf", "application/pdf", "pdf content".getBytes());
        Attachment result = attachmentService.upload(userId, visitId, file, "prescription");

        assertThat(result.getDisplayName()).isEqualTo("prescription.pdf");
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void generatePresignedUrl_returnsUrl() throws Exception {
        Attachment attachment = new Attachment();
        attachment.setId(UUID.randomUUID());
        attachment.setR2Key("uploads/test.pdf");
        attachment.setVisit(visit);

        when(attachmentRepository.findById(attachment.getId())).thenReturn(Optional.of(attachment));

        PresignedGetObjectRequest presignedReq = mock(PresignedGetObjectRequest.class);
        when(presignedReq.url()).thenReturn(new URL("https://example.com/signed"));
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedReq);

        String url = attachmentService.generatePresignedUrl(userId, attachment.getId());
        assertThat(url).isEqualTo("https://example.com/signed");
    }
}
