package com.example.backend.group.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class GroupMediaDto {
    private List<MediaItem> images;
    private List<MediaItem> videos;
    private List<MediaItem> files;
    private List<LinkItem> links;

    @Data
    @Builder
    public static class MediaItem {
        private UUID id;
        private String url;
        private String fileName;
        private String senderName;
        private Instant createdDate;
    }

    @Data
    @Builder
    public static class LinkItem {
        private String url;
        private String senderName;
        private Instant createdDate;
    }
}
