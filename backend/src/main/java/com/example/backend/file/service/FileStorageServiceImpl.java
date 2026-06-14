package com.example.backend.file.service;

import com.example.backend.shared.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    @Value("${r2.access-key-id}")
    private String accessKeyId;

    @Value("${r2.secret-access-key}")
    private String secretAccessKey;

    @Value("${r2.bucket}")
    private String bucketName;

    @Value("${r2.region:auto}")
    private String region;

    @Value("${r2.endpoint:}")
    private String s3Endpoint;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    private static final Duration PRESIGN_DURATION = Duration.ofMinutes(30);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "video/mp4", "video/webm",
            "audio/mpeg", "audio/ogg",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed"
    );

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;

    @PostConstruct
    public void init() {
        if (accessKeyId == null || accessKeyId.isBlank() || secretAccessKey == null || secretAccessKey.isBlank()) {
            log.warn("R2/S3 credentials are missing or blank. File storage will be disabled.");
            return;
        }

        try {
            var credentials = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey));
            var regionObj = Region.of(region == null || region.isBlank() ? "auto" : region);

            var clientBuilder = S3Client.builder()
                    .region(regionObj)
                    .credentialsProvider(credentials);
            var presignerBuilder = S3Presigner.builder()
                    .region(regionObj)
                    .credentialsProvider(credentials);

            if (s3Endpoint != null && !s3Endpoint.isBlank()) {
                clientBuilder.endpointOverride(URI.create(s3Endpoint));
                presignerBuilder.endpointOverride(URI.create(s3Endpoint));
            }

            s3Client = clientBuilder.build();
            s3Presigner = presignerBuilder.build();

            log.info("R2 storage initialized for bucket: {}", bucketName);
        } catch (Exception e) {
            log.error("Failed to initialize R2 storage: {}", e.getMessage());
        }
    }

    @Override
    public String saveFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size (50MB)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File type not allowed: " + contentType);
        }

        try {
            String extension = getExtensionFromContentType(contentType);
            String key = UUID.randomUUID() + extension;

            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(contentType)
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            return key;
        } catch (IOException e) {
            throw new RuntimeException("Could not save file: " + e.getMessage());
        }
    }

    @Override
    public String generatePresignedUrl(String identifier) {
        String key = extractKey(identifier);
        var presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(PRESIGN_DURATION)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build())
                .build();
        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public byte[] loadFile(String identifier) {
        String key = extractKey(identifier);
        try {
            return s3Client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucketName).key(key).build()
            ).asByteArray();
        } catch (NoSuchKeyException e) {
            throw new ResourceNotFoundException("File not found: " + identifier);
        } catch (Exception e) {
            throw new RuntimeException("Could not load file: " + e.getMessage());
        }
    }

    @Override
    public long getFileSize(String identifier) {
        String key = extractKey(identifier);
        HeadObjectResponse head = s3Client.headObject(
                HeadObjectRequest.builder().bucket(bucketName).key(key).build());
        return head.contentLength();
    }

    @Override
    public InputStream loadFileStream(String identifier, long start, long length) {
        String key = extractKey(identifier);
        String range = "bytes=" + start + "-" + (start + length - 1);
        return s3Client.getObject(
                GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .range(range)
                        .build());
    }

    @Override
    public void deleteFile(String identifier) {
        String key = extractKey(identifier);
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
    }

    @Override
    public String detectContentType(String identifier) {
        String name = extractKey(identifier).toLowerCase();
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".gif")) return "image/gif";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".mp4")) return "video/mp4";
        if (name.endsWith(".webm")) return "video/webm";
        if (name.endsWith(".mp3")) return "audio/mpeg";
        if (name.endsWith(".ogg")) return "audio/ogg";
        if (name.endsWith(".pdf")) return "application/pdf";
        if (name.endsWith(".doc")) return "application/msword";
        if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (name.endsWith(".xls")) return "application/vnd.ms-excel";
        if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (name.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        if (name.endsWith(".txt")) return "text/plain";
        if (name.endsWith(".zip")) return "application/zip";
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    private String extractKey(String identifier) {
        if (identifier != null && identifier.startsWith("http")) {
            int idx = identifier.indexOf(".amazonaws.com/");
            if (idx != -1) {
                return identifier.substring(idx + ".amazonaws.com/".length());
            }
            int r2idx = identifier.indexOf(".r2.cloudflarestorage.com/");
            if (r2idx != -1) {
                String afterHost = identifier.substring(r2idx + ".r2.cloudflarestorage.com/".length());
                int slashIdx = afterHost.indexOf('/');
                return slashIdx != -1 ? afterHost.substring(slashIdx + 1) : afterHost;
            }
            try {
                URI uri = URI.create(identifier);
                String path = uri.getPath();
                int lastSlash = path.lastIndexOf('/');
                if (lastSlash >= 0) return path.substring(lastSlash + 1);
            } catch (Exception ignored) {}
        }
        return identifier;
    }

    private String getExtensionFromContentType(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            case "application/pdf" -> ".pdf";
            case "audio/mpeg" -> ".mp3";
            case "audio/ogg" -> ".ogg";
            case "application/msword" -> ".doc";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            case "application/vnd.ms-excel" -> ".xls";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> ".xlsx";
            case "application/vnd.ms-powerpoint" -> ".ppt";
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> ".pptx";
            case "text/plain" -> ".txt";
            case "application/zip", "application/x-zip-compressed" -> ".zip";
            default -> "";
        };
    }
}
