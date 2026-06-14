package com.example.backend.messaging.controller;

import com.example.backend.messaging.dto.MessageDto;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.messaging.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;
import java.util.List;

@RestController
@RequestMapping("/api/v1/message")
@RequiredArgsConstructor
public class MessageController {
    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    @PostMapping
    public ResponseEntity<MessageDto> saveMessage(
            @RequestBody MessageDto messageDto,
            Authentication currentUser) {
        MessageDto saved = messageService.sendMessage(messageDto, currentUser);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/upload-media/{chatId}")
    public ResponseEntity<MessageDto> uploadMedia(
            @PathVariable String chatId,
            @RequestParam("file") MultipartFile file,
            Authentication currentUser) {
        MessageDto saved = messageService.uploadMediaMessage(chatId, file, currentUser);
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/delivered/{chatId}")
    public ResponseEntity<Void> setMessagesToDelivered(
            @PathVariable String chatId,
            Authentication currentUser) {
        messageService.setMessagesToDelivered(chatId, currentUser);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/delivered/all")
    public ResponseEntity<Void> setAllMessagesToDelivered(Authentication currentUser) {
        messageService.setAllMessagesToDelivered(currentUser);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/seen/{chatId}")
    public ResponseEntity<Void> setMessagesToSeen(
            @PathVariable String chatId,
            Authentication currentUser) {
        messageService.setMessagesToSeen(chatId, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/chat/{chatId}")
    public ResponseEntity<List<MessageDto>> getMessagesByChatId(
            @PathVariable String chatId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication currentUser) {  // ✅ FIX: Thêm Authentication để verify quyền truy cập
        return ResponseEntity.ok(messageService.getMessagesByChatId(chatId, page, size, currentUser));
    }

    @DeleteMapping("/{messageId}/recall")
    public ResponseEntity<Void> recallMessage(
            @PathVariable java.util.UUID messageId,
            Authentication currentUser) {
        messageService.recallMessage(messageId, currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessageForMe(
            @PathVariable java.util.UUID messageId,
            Authentication currentUser) {
        messageService.deleteMessageForMe(messageId, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/media/{filename}")
    public ResponseEntity<StreamingResponseBody> getMediaFile(
            @PathVariable String filename,
            @RequestParam(required = false, defaultValue = "false") boolean download,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {

        long fileSize = fileStorageService.getFileSize(filename);
        String contentType = fileStorageService.detectContentType(filename);

        long start = 0;
        long end = fileSize - 1;
        boolean partial = rangeHeader != null && rangeHeader.startsWith("bytes=");

        if (partial) {
            String range = rangeHeader.substring("bytes=".length());
            String[] parts = range.split("-");
            start = Long.parseLong(parts[0]);
            end = parts.length > 1 && !parts[1].isBlank() ? Long.parseLong(parts[1]) : fileSize - 1;
        }

        final long finalStart = start;
        final long finalContentLength = end - start + 1;

        StreamingResponseBody body = out -> {
            try (InputStream in = fileStorageService.loadFileStream(filename, finalStart, finalContentLength)) {
                in.transferTo(out);
            }
        };

        return (partial ? ResponseEntity.status(HttpStatus.PARTIAL_CONTENT) : ResponseEntity.ok())
                .header("Accept-Ranges", "bytes")
                .header("Content-Range", "bytes " + start + "-" + end + "/" + fileSize)
                .header("Content-Length", String.valueOf(finalContentLength))
                .contentType(MediaType.parseMediaType(contentType))
                .header("Content-Disposition", download
                        ? "attachment; filename=\"" + filename + "\""
                        : "inline")
                .body(body);
    }
}