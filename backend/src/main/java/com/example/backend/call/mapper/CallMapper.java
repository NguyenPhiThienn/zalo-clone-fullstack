package com.example.backend.call.mapper;

import com.example.backend.call.dto.CallSessionDto;
import com.example.backend.call.entity.CallSession;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CallMapper {

    @Mapping(target = "chatId", source = "chat.id")
    @Mapping(target = "initiatorId", source = "initiator.id")
    @Mapping(target = "initiatorName", expression = "java(session.getInitiator().getFirstName() + \" \" + session.getInitiator().getLastName())")
    @Mapping(target = "initiatorAvatar", source = "initiator.avatarUrl")
    @Mapping(target = "receiverId", source = "receiver.id")
    @Mapping(target = "receiverName", expression = "java(session.getReceiver().getFirstName() + \" \" + session.getReceiver().getLastName())")
    @Mapping(target = "receiverAvatar", source = "receiver.avatarUrl")
    CallSessionDto toDto(CallSession session);
}
