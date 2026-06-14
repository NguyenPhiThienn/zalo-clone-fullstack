package com.example.backend.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupEventDto {
    public static final String MEMBER_REMOVED   = "MEMBER_REMOVED";
    public static final String MEMBER_LEFT      = "MEMBER_LEFT";
    public static final String MEMBER_ADDED     = "MEMBER_ADDED";
    public static final String ADMIN_CHANGED    = "ADMIN_CHANGED";
    public static final String GROUP_UPDATED    = "GROUP_UPDATED";
    public static final String MESSAGE_PINNED   = "MESSAGE_PINNED";
    public static final String MESSAGE_UNPINNED = "MESSAGE_UNPINNED";
    public static final String GROUP_DISSOLVED  = "GROUP_DISSOLVED";
    public static final String JOIN_REQUEST     = "JOIN_REQUEST";

    private String type;
    private UUID groupId;
    private UUID targetUserId;
    private UUID actorId; // Reverted back to actorId as used in GroupServiceImpl
    private String actorName;
    private GroupDto group; // Reverted back to group as used in GroupServiceImpl
    private List<GroupMessageDto> pinnedMessages;
    private GroupJoinRequestDto joinRequest;
}
