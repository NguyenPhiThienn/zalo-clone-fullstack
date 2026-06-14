package com.example.backend.ai.mapper;

import com.example.backend.ai.entity.AiMessage;
import com.example.backend.ai.dto.AiMessageDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AiMessageMapper {
    AiMessageDto toDto(AiMessage aiMessage);
}
