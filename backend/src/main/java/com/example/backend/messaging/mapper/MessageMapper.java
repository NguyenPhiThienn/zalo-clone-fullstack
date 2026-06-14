package com.example.backend.messaging.mapper;

import com.example.backend.file.service.FileStorageService;
import com.example.backend.messaging.entity.Message;
import com.example.backend.messaging.enums.MessageType;
import com.example.backend.messaging.dto.MessageDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring")
public abstract class MessageMapper {

    @Autowired
    protected FileStorageService fileStorageService;

    @Mapping(target = "senderId", source = "sender.id")
    @Mapping(target = "chatId", source = "chat.id")
    @Mapping(target = "createdAt", source = "createdDate")
    @Mapping(target = "receiverId", expression = "java(message.getReceiver() != null ? message.getReceiver().getId() : null)")
    @Mapping(target = "mediaUrl", source = "message", qualifiedByName = "toMediaUrl")
    @Mapping(target = "reactions", ignore = true)
    @Mapping(target = "senderName", ignore = true)
    public abstract MessageDto toDto(Message message);

    @Named("toMediaUrl")
    String toMediaUrl(Message message) {
        if (message.getType() == null || message.getType() == MessageType.TEXT) {
            return null;
        }
        String content = message.getContent();
        if (content == null || content.isBlank() || message.isDeleted()) {
            return null;
        }
        return fileStorageService.generatePresignedUrl(content);
    }
}
