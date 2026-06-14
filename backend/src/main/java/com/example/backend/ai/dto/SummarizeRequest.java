package com.example.backend.ai.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class SummarizeRequest {
    /** Tóm tắt từ thời điểm này (ISO Instant) */
    private Instant since;
}
