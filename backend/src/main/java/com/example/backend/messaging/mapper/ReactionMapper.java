package com.example.backend.messaging.mapper;

import com.example.backend.messaging.entity.MessageReaction;
import com.example.backend.reaction.dto.ReactionDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReactionMapper {
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userFullName", expression = "java(reaction.getUser().getFirstName() + \" \" + reaction.getUser().getLastName())")
    ReactionDto toDto(MessageReaction reaction);
}
