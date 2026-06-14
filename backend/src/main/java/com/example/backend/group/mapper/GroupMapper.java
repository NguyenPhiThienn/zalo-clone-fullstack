package com.example.backend.group.mapper;

import com.example.backend.group.dto.GroupDto;
import com.example.backend.group.dto.GroupMemberDto;
import com.example.backend.group.dto.GroupMessageDto;
import com.example.backend.group.entity.Group;
import com.example.backend.group.entity.GroupMember;
import com.example.backend.group.entity.GroupMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.UUID;

@Mapper(componentModel = "spring")
public interface GroupMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "firstName", source = "user.firstName")
    @Mapping(target = "lastName", source = "user.lastName")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "avatarUrl", source = "user.avatarUrl")
    @Mapping(target = "online", expression = "java(member.getUser().isUserOnline())")
    @Mapping(target = "lastSeenText", expression = "java(member.getUser().getLastSeenText())")
    GroupMemberDto toMemberDto(GroupMember member);

    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "memberCount", expression = "java(group.getMembers().size())")
    @Mapping(target = "isAdmin", ignore = true) // Handled in service
    GroupDto toDto(Group group);

    @Mapping(target = "groupId", source = "group.id")
    @Mapping(target = "senderId", source = "sender.id")
    @Mapping(target = "senderName", expression = "java(message.getSender().getFirstName() + \" \" + message.getSender().getLastName())")
    @Mapping(target = "isMine", ignore = true) // Handled in service
    @Mapping(target = "pinned", ignore = true) // Handled in service
    @Mapping(target = "mediaUrl", ignore = true) // Handled in service
    GroupMessageDto toMessageDto(GroupMessage message);
}
