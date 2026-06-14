package com.example.backend.group.service;

import com.example.backend.group.dto.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface GroupService {
    GroupDto createGroup(GroupRequest.Create request, Authentication currentUser);
    List<GroupDto> getMyGroups(Authentication currentUser);
    GroupDto getGroupById(UUID groupId, Authentication currentUser);
    GroupDto updateGroup(UUID groupId, GroupRequest.Update request, Authentication currentUser);
    GroupDto uploadGroupAvatar(UUID groupId, MultipartFile file, Authentication currentUser);
    GroupDto addMembers(UUID groupId, GroupRequest.AddMember request, Authentication currentUser);
    void removeMember(UUID groupId, UUID targetUserId, Authentication currentUser);
    void leaveGroup(UUID groupId, UUID newAdminId, Authentication currentUser);
    GroupDto setMemberAsAdmin(UUID groupId, UUID targetUserId, Authentication currentUser);
    void dissolveGroup(UUID groupId, Authentication currentUser);
    List<GroupMessageDto> pinMessage(UUID groupId, UUID messageId, Authentication currentUser);
    List<GroupMessageDto> unpinMessage(UUID groupId, UUID messageId, Authentication currentUser);
    List<GroupMessageDto> getPinnedMessages(UUID groupId, Authentication currentUser);
    List<GroupJoinRequestDto> createJoinRequests(UUID groupId, List<UUID> userIds, Authentication currentUser);
    List<GroupJoinRequestDto> getJoinRequests(UUID groupId, Authentication currentUser);
    GroupDto approveJoinRequest(UUID groupId, UUID requestId, Authentication currentUser);
    void rejectJoinRequest(UUID groupId, UUID requestId, Authentication currentUser);
    GroupMessageDto sendMessage(UUID groupId, GroupRequest.SendMessage request, Authentication currentUser);
    GroupMessageDto uploadGroupMediaMessage(UUID groupId, MultipartFile file, Authentication currentUser);
    void recallGroupMessage(UUID messageId, Authentication currentUser);
    void deleteGroupMessageForMe(UUID messageId, Authentication currentUser);
    List<GroupMessageDto> getMessages(UUID groupId, int page, int size, Authentication currentUser);
    GroupMediaDto getGroupMedia(UUID groupId);
}
