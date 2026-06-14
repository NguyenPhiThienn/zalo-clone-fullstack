package com.example.backend.ai.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class SummarizeResponse {
    private String summary;
    private int messageCount;
    private List<String> topSpeakers; // "Minh (18 tin)"
    private Instant from;
    private Instant to;
}
