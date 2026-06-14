package com.example.backend.ai.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SmartReplyResponse {
    private List<String> suggestions;
}
