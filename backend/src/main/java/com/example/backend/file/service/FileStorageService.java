package com.example.backend.file.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

public interface FileStorageService {
    String saveFile(MultipartFile file);
    String generatePresignedUrl(String identifier);
    byte[] loadFile(String identifier);
    long getFileSize(String identifier);
    InputStream loadFileStream(String identifier, long start, long length);
    void deleteFile(String identifier);
    String detectContentType(String identifier);
}
