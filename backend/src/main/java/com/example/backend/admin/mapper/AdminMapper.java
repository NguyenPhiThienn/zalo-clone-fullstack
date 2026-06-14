package com.example.backend.admin.mapper;

import com.example.backend.admin.dto.AdminGroupDto;
import com.example.backend.admin.dto.AdminUserDto;
import com.example.backend.admin.dto.AuditLogDto;
import com.example.backend.admin.entity.AuditLog;
import com.example.backend.group.entity.Group;
import com.example.backend.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AdminMapper {

    @Mapping(target = "online", source = "online")
    AdminUserDto toUserDto(User user);

    @Mapping(target = "memberCount", expression = "java(group.getMembers().size())")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "createdByName", expression = "java(group.getCreatedBy().getFirstName() + \" \" + group.getCreatedBy().getLastName())")
    AdminGroupDto toGroupDto(Group group);

    @Mapping(target = "adminId", source = "admin.id")
    @Mapping(target = "createdAt", source = "createdAt")
    AuditLogDto toAuditLogDto(AuditLog auditLog);
}
