package com.example.backend.group.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.backend.ai.service.GroupAiService;
import com.example.backend.group.dto.GroupMediaDto;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.group.dto.GroupDto;
import com.example.backend.group.dto.GroupEventDto;
import com.example.backend.group.dto.GroupJoinRequestDto;
import com.example.backend.group.dto.GroupMemberDto;
import com.example.backend.group.dto.GroupMessageDto;
import com.example.backend.group.dto.GroupRequest;
import com.example.backend.group.entity.Group;
import com.example.backend.group.entity.GroupJoinRequest;
import com.example.backend.group.entity.GroupJoinRequestStatus;
import com.example.backend.group.entity.GroupMember;
import com.example.backend.group.entity.GroupMessage;
import com.example.backend.group.entity.GroupMessageHidden;
import com.example.backend.group.entity.PinnedGroupMessage;
import com.example.backend.group.repository.GroupJoinRequestRepository;
import com.example.backend.group.repository.GroupMemberRepository;
import com.example.backend.group.repository.GroupMessageHiddenRepository;
import com.example.backend.group.repository.GroupMessageReactionRepository;
import com.example.backend.group.repository.GroupMessageRepository;
import com.example.backend.group.repository.GroupRepository;
import com.example.backend.group.repository.PinnedGroupMessageRepository;
import com.example.backend.messaging.enums.MessageType;
import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.service.GroupUnreadService;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupMessageReactionRepository groupMessageReactionRepository;
    private final PinnedGroupMessageRepository pinnedGroupMessageRepository;
    private final GroupMessageHiddenRepository groupMessageHiddenRepository;
    private final GroupJoinRequestRepository groupJoinRequestRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final FileStorageService fileStorageService;
    private final GroupAiService groupAiService;
    private final GroupUnreadService groupUnreadService;
    private final com.example.backend.group.mapper.GroupMapper groupMapper;

    @Override
    @Transactional
    public GroupDto createGroup(GroupRequest.Create request, Authentication currentUser) {
        User creator = getUser(currentUser);

        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(creator)
                .members(new ArrayList<>())
                .build();

        Group saved = groupRepository.save(group);

        saved.getMembers().add(GroupMember.of(saved, creator, true));

        for (UUID memberId : request.getMemberIds()) {
            if (memberId.equals(creator.getId())) continue;
            User member = userRepository.findById(memberId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + memberId));
            saved.getMembers().add(GroupMember.of(saved, member, false));
        }

        groupRepository.save(saved);
        log.info("Group '{}' created by {}", saved.getName(), creator.getEmail());
        return toGroupDto(saved, creator.getId(), false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupDto> getMyGroups(Authentication currentUser) {
        User user = getUser(currentUser);
        return groupRepository.findAllGroupsByUserId(user.getId())
                .stream()
                .map(g -> {
                    GroupDto dto = toGroupDto(g, user.getId(), false);
                    dto.setUnreadCount(groupUnreadService.getCount(g.getId(), user.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GroupDto getGroupById(UUID groupId, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckMember(groupId, user.getId());
        return toGroupDto(group, user.getId(), true);
    }

    @Override
    @Transactional
    public GroupDto updateGroup(UUID groupId, GroupRequest.Update request, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, user.getId());

        boolean nameChanged = request.getName() != null && !request.getName().equals(group.getName());
        String newName = request.getName();

        if (request.getName() != null) group.setName(request.getName());
        if (request.getDescription() != null) group.setDescription(request.getDescription());
        if (request.getAvatarUrl() != null) group.setAvatarUrl(request.getAvatarUrl());

        groupRepository.save(group);
        log.info("Group '{}' updated by {}", group.getName(), user.getEmail());

        GroupDto dto = toGroupDto(group, user.getId(), false);
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.GROUP_UPDATED)
                .groupId(groupId)
                .actorId(user.getId())
                .group(dto)
                .build());

        if (nameChanged) {
            String actorName = user.getFirstName() + " " + user.getLastName();
            sendSystemMessage(groupId, group, user,
                    actorName + " đã đổi tên nhóm thành \"" + newName + "\"");
        }
        return dto;
    }

    @Override
    @Transactional
    public GroupDto uploadGroupAvatar(UUID groupId, MultipartFile file, Authentication currentUser) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Chỉ chấp nhận file ảnh");
        }

        User user = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, user.getId());

        String filename = fileStorageService.saveFile(file);
        group.setAvatarUrl(filename);

        groupRepository.save(group);
        log.info("Group '{}' avatar updated by {}", group.getName(), user.getEmail());

        GroupDto dto = toGroupDto(group, user.getId(), false);
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.GROUP_UPDATED)
                .groupId(groupId)
                .actorId(user.getId())
                .group(dto)
                .build());

        String actorName = user.getFirstName() + " " + user.getLastName();
        sendSystemMessage(groupId, group, user, actorName + " đã thay đổi ảnh đại diện nhóm");
        return dto;
    }

    @Override
    @Transactional
    public GroupDto addMembers(UUID groupId, GroupRequest.AddMember request, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, user.getId());

        List<String> addedNames = new java.util.ArrayList<>();
        for (UUID userId : request.getUserIds()) {
            if (groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) continue;
            User newMember = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            group.getMembers().add(GroupMember.of(group, newMember, false));
            addedNames.add(newMember.getFirstName() + " " + newMember.getLastName());
        }

        groupRepository.save(group);
        log.info("{} members added to group '{}'", request.getUserIds().size(), group.getName());

        GroupDto dto = toGroupDto(group, user.getId(), false);
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.MEMBER_ADDED)
                .groupId(groupId)
                .actorId(user.getId())
                .group(dto)
                .build());

        if (!addedNames.isEmpty()) {
            String actorName = user.getFirstName() + " " + user.getLastName();
            sendSystemMessage(groupId, group, user,
                    actorName + " đã thêm " + String.join(", ", addedNames) + " vào nhóm");
        }
        return dto;
    }

    @Override
    @Transactional
    public void removeMember(UUID groupId, UUID targetUserId, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, user.getId());

        if (user.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Admin không thể tự xóa mình, hãy dùng rời nhóm");
        }

        GroupMember member = group.getMembers().stream()
                .filter(m -> m.getUser().getId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Thành viên không tồn tại trong nhóm"));

        String kickedName = member.getUser().getFirstName() + " " + member.getUser().getLastName();
        String kickedEmail = member.getUser().getEmail();
        group.getMembers().remove(member);
        groupRepository.save(group);
        log.info("User {} removed from group {}", targetUserId, groupId);

        GroupEventDto event = GroupEventDto.builder()
                .type(GroupEventDto.MEMBER_REMOVED)
                .groupId(groupId)
                .targetUserId(targetUserId)
                .actorId(user.getId())
                .build();
        broadcastGroupEvent(groupId, event);

        messagingTemplate.convertAndSendToUser(kickedEmail, "/queue/group-events", event);

        String actorName = user.getFirstName() + " " + user.getLastName();
        sendSystemMessage(groupId, group, user, actorName + " đã xóa " + kickedName + " khỏi nhóm");
    }

    @Override
    @Transactional
    public void leaveGroup(UUID groupId, UUID newAdminId, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckMember(groupId, user.getId());

        boolean isAdmin = group.isAdmin(user.getId());
        long adminCount = group.getMembers().stream().filter(GroupMember::isAdmin).count();
        long memberCount = group.getMembers().size();

        if (isAdmin && adminCount == 1 && memberCount > 1) {
            if (newAdminId == null) {
                throw new IllegalArgumentException("Bạn là admin cuối cùng, hãy chỉ định admin mới trước khi rời nhóm");
            }
            GroupMember newAdmin = groupMemberRepository
                    .findByGroupIdAndUserId(groupId, newAdminId)
                    .orElseThrow(() -> new ResourceNotFoundException("Thành viên không tồn tại trong nhóm"));
            if (newAdmin.getUser().getId().equals(user.getId())) {
                throw new IllegalArgumentException("Không thể chọn chính mình làm admin mới");
            }
            newAdmin.setAdmin(true);
            groupMemberRepository.save(newAdmin);
        }

        GroupMember member = group.getMembers().stream()
                .filter(m -> m.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Bạn không phải thành viên nhóm này"));

        group.getMembers().remove(member);
        groupRepository.save(group);

        if (groupMemberRepository.countByGroupId(groupId) == 0) {
            groupRepository.delete(group);
            log.info("Group {} deleted — no members left", groupId);
        } else {
            log.info("User {} left group {}", user.getEmail(), groupId);
            broadcastGroupEvent(groupId, GroupEventDto.builder()
                    .type(GroupEventDto.MEMBER_LEFT)
                    .groupId(groupId)
                    .targetUserId(user.getId())
                    .actorId(user.getId())
                    .build());
            String actorName = user.getFirstName() + " " + user.getLastName();
            sendSystemMessage(groupId, group, user, actorName + " đã rời nhóm");
        }
    }

    @Override
    @Transactional
    public GroupDto setMemberAsAdmin(UUID groupId, UUID targetUserId, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, user.getId());

        if (user.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Bạn đã là admin rồi");
        }

        GroupMember member = groupMemberRepository
                .findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Thành viên không tồn tại trong nhóm"));

        if (member.isAdmin()) {
            throw new IllegalArgumentException("Thành viên này đã là admin");
        }

        GroupMember callerMember = groupMemberRepository
                .findByGroupIdAndUserId(groupId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên"));
        callerMember.setAdmin(false);
        groupMemberRepository.save(callerMember);

        member.setAdmin(true);
        groupMemberRepository.save(member);
        log.info("User {} transferred admin to {} in group {}", user.getEmail(), targetUserId, groupId);

        GroupDto dto = toGroupDto(group, user.getId(), false);
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.ADMIN_CHANGED)
                .groupId(groupId)
                .targetUserId(targetUserId)
                .actorId(user.getId())
                .group(dto)
                .build());

        String actorName = user.getFirstName() + " " + user.getLastName();
        String targetName = member.getUser().getFirstName() + " " + member.getUser().getLastName();
        sendSystemMessage(groupId, group, user,
                actorName + " đã nhường quyền quản trị viên cho " + targetName);
        return dto;
    }

    @Override
    @Transactional
    public void dissolveGroup(UUID groupId, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, user.getId());

        List<String> memberEmails = group.getMembers().stream()
                .map(m -> m.getUser().getEmail())
                .filter(email -> !email.equals(user.getEmail()))
                .toList();

        GroupEventDto event = GroupEventDto.builder()
                .type(GroupEventDto.GROUP_DISSOLVED)
                .groupId(groupId)
                .actorId(user.getId())
                .build();

        broadcastGroupEvent(groupId, event);

        memberEmails.forEach(email ->
                messagingTemplate.convertAndSendToUser(email, "/queue/group-events", event));

        groupMemberRepository.deleteByGroupId(groupId);
        groupRepository.delete(group);
        groupUnreadService.deleteGroup(groupId);
        log.info("Group {} dissolved by admin {}", groupId, user.getEmail());
    }

    @Override
    @Transactional
    public List<GroupMessageDto> pinMessage(UUID groupId, UUID messageId, Authentication currentUser) {
        User user = getUser(currentUser);
        getGroupAndCheckMember(groupId, user.getId());

        GroupMessage msg = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn không tồn tại"));

        if (!msg.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Tin nhắn không thuộc nhóm này");
        }

        if (pinnedGroupMessageRepository.findByGroupIdAndMessageId(groupId, messageId).isPresent()) {
            throw new IllegalArgumentException("Tin nhắn đã được ghim");
        }

        long count = pinnedGroupMessageRepository.countByGroupId(groupId);
        if (count >= 3) {
            throw new IllegalArgumentException("Nhóm chỉ được ghim tối đa 3 tin nhắn");
        }

        PinnedGroupMessage pinned = PinnedGroupMessage.builder()
                .group(msg.getGroup())
                .message(msg)
                .pinnedBy(user)
                .build();
        pinnedGroupMessageRepository.save(pinned);

        List<GroupMessageDto> pinnedDtos = getPinnedMessageDtos(groupId, user.getId());
        String actorName = user.getFirstName() + " " + user.getLastName();
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.MESSAGE_PINNED)
                .groupId(groupId)
                .actorId(user.getId())
                .actorName(actorName)
                .pinnedMessages(pinnedDtos)
                .build());
        sendSystemMessage(groupId, msg.getGroup(), user, actorName + " đã ghim một tin nhắn");
        return pinnedDtos;
    }

    @Override
    @Transactional
    public List<GroupMessageDto> unpinMessage(UUID groupId, UUID messageId, Authentication currentUser) {
        User user = getUser(currentUser);
        getGroupAndCheckMember(groupId, user.getId());

        pinnedGroupMessageRepository.deleteByGroupIdAndMessageId(groupId, messageId);

        List<GroupMessageDto> pinnedDtos = getPinnedMessageDtos(groupId, user.getId());
        String actorName = user.getFirstName() + " " + user.getLastName();
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.MESSAGE_UNPINNED)
                .groupId(groupId)
                .actorId(user.getId())
                .actorName(actorName)
                .pinnedMessages(pinnedDtos)
                .build());
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại"));
        sendSystemMessage(groupId, group, user, actorName + " đã bỏ ghim một tin nhắn");
        return pinnedDtos;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupMessageDto> getPinnedMessages(UUID groupId, Authentication currentUser) {
        User user = getUser(currentUser);
        getGroupAndCheckMember(groupId, user.getId());
        return getPinnedMessageDtos(groupId, user.getId());
    }

    @Override
    @Transactional
    public List<GroupJoinRequestDto> createJoinRequests(UUID groupId, List<UUID> userIds, Authentication currentUser) {
        User requester = getUser(currentUser);
        Group group = getGroupAndCheckMember(groupId, requester.getId());

        List<GroupJoinRequest> created = new java.util.ArrayList<>();
        for (UUID targetId : userIds) {
            if (groupMemberRepository.existsByGroupIdAndUserId(groupId, targetId)) continue;
            if (groupJoinRequestRepository
                    .findByGroupIdAndTargetUserIdAndStatus(groupId, targetId, GroupJoinRequestStatus.PENDING)
                    .isPresent()) continue;
            User target = userRepository.findById(targetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại: " + targetId));
            GroupJoinRequest req = GroupJoinRequest.builder()
                    .group(group)
                    .requestedBy(requester)
                    .targetUser(target)
                    .status(GroupJoinRequestStatus.PENDING)
                    .build();
            groupJoinRequestRepository.save(req);
            created.add(req);
        }

        List<GroupJoinRequestDto> dtos = created.stream().map(this::toJoinRequestDto).toList();

        String requesterName = requester.getFirstName() + " " + requester.getLastName();
        group.getMembers().stream()
                .filter(GroupMember::isAdmin)
                .forEach(admin -> dtos.forEach(dto ->
                    messagingTemplate.convertAndSendToUser(
                        admin.getUser().getEmail(), "/queue/group-events",
                        GroupEventDto.builder()
                                .type(GroupEventDto.JOIN_REQUEST)
                                .groupId(groupId)
                                .actorId(requester.getId())
                                .actorName(requesterName)
                                .joinRequest(dto)
                                .build()
                    )
                ));

        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupJoinRequestDto> getJoinRequests(UUID groupId, Authentication currentUser) {
        User user = getUser(currentUser);
        getGroupAndCheckAdmin(groupId, user.getId());
        return groupJoinRequestRepository
                .findByGroupIdAndStatus(groupId, GroupJoinRequestStatus.PENDING)
                .stream().map(this::toJoinRequestDto).toList();
    }

    @Override
    @Transactional
    public GroupDto approveJoinRequest(UUID groupId, UUID requestId, Authentication currentUser) {
        User admin = getUser(currentUser);
        Group group = getGroupAndCheckAdmin(groupId, admin.getId());

        GroupJoinRequest req = groupJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Yêu cầu không tồn tại"));
        if (req.getStatus() != GroupJoinRequestStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu đã được xử lý");
        }

        User target = req.getTargetUser();
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, target.getId())) {
            group.getMembers().add(GroupMember.of(group, target, false));
            groupRepository.save(group);
        }

        req.setStatus(GroupJoinRequestStatus.APPROVED);
        groupJoinRequestRepository.save(req);

        GroupDto dto = toGroupDto(group, admin.getId(), false);
        broadcastGroupEvent(groupId, GroupEventDto.builder()
                .type(GroupEventDto.MEMBER_ADDED)
                .groupId(groupId)
                .actorId(admin.getId())
                .group(dto)
                .build());
        return dto;
    }

    @Override
    @Transactional
    public void rejectJoinRequest(UUID groupId, UUID requestId, Authentication currentUser) {
        User admin = getUser(currentUser);
        getGroupAndCheckAdmin(groupId, admin.getId());

        GroupJoinRequest req = groupJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Yêu cầu không tồn tại"));
        if (req.getStatus() != GroupJoinRequestStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu đã được xử lý");
        }
        req.setStatus(GroupJoinRequestStatus.REJECTED);
        groupJoinRequestRepository.save(req);
    }

    private GroupJoinRequestDto toJoinRequestDto(GroupJoinRequest req) {
        User by = req.getRequestedBy();
        User target = req.getTargetUser();
        return new GroupJoinRequestDto(
                req.getId(),
                by.getId(),
                by.getFirstName() + " " + by.getLastName(),
                by.getAvatarUrl(),
                target.getId(),
                target.getFirstName() + " " + target.getLastName(),
                target.getAvatarUrl(),
                req.getCreatedDate() != null ? req.getCreatedDate().toString() : null
        );
    }

    @Override
    @Transactional
    public GroupMessageDto sendMessage(UUID groupId, GroupRequest.SendMessage request, Authentication currentUser) {
        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Nội dung tin nhắn không được để trống");
        }
        User user = getUser(currentUser);
        Group group = getGroupAndCheckMember(groupId, user.getId());

        GroupMessage msg = GroupMessage.builder()
                .group(group)
                .sender(user)
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : MessageType.TEXT)
                .build();

        GroupMessage saved = groupMessageRepository.save(msg);
        GroupMessageDto dto = toMessageDto(saved, user.getId(), Set.of());

        messagingTemplate.convertAndSend("/topic/group/" + groupId, dto);
        log.debug("Message sent to group {} by {}", groupId, user.getEmail());
        group.getMembers().stream()
                .map(m -> m.getUser().getId())
                .filter(id -> !id.equals(user.getId()))
                .forEach(id -> groupUnreadService.increment(groupId, id));

        String content = request.getContent();
        if (content != null && content.toLowerCase().contains("@ai")) {
            String senderName = user.getFirstName() + " " + user.getLastName();
            groupAiService.handleBotMentionAsync(groupId, content, senderName);
        }

        return dto;
    }

    @Override
    @Transactional
    public GroupMessageDto uploadGroupMediaMessage(UUID groupId, MultipartFile file, Authentication currentUser) {
        User user = getUser(currentUser);
        Group group = getGroupAndCheckMember(groupId, user.getId());

        String contentType = file.getContentType() != null ? file.getContentType() : "";
        MessageType messageType;
        if (contentType.startsWith("image/")) {
            messageType = MessageType.IMAGE;
        } else if (contentType.startsWith("video/")) {
            messageType = MessageType.VIDEO;
        } else if (contentType.startsWith("audio/")) {
            messageType = MessageType.AUDIO;
        } else {
            messageType = MessageType.FILE;
        }

        String filePath = fileStorageService.saveFile(file);

        GroupMessage msg = GroupMessage.builder()
                .group(group)
                .sender(user)
                .content(filePath)
                .type(messageType)
                .fileName(file.getOriginalFilename())
                .build();

        GroupMessage saved = groupMessageRepository.save(msg);
        GroupMessageDto dto = toMessageDto(saved, user.getId(), Set.of());

        messagingTemplate.convertAndSend("/topic/group/" + groupId, dto);
        log.info("Media message sent to group {} by {}", groupId, user.getEmail());
        group.getMembers().stream()
                .map(m -> m.getUser().getId())
                .filter(id -> !id.equals(user.getId()))
                .forEach(id -> groupUnreadService.increment(groupId, id));
        return dto;
    }

    @Override
    @Transactional
    public void recallGroupMessage(UUID messageId, Authentication currentUser) {
        User user = getUser(currentUser);

        GroupMessage msg = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn không tồn tại: " + messageId));

        boolean isSender = msg.getSender().getId().equals(user.getId());
        boolean isAdmin = msg.getGroup().isAdmin(user.getId());

        if (!isSender && !isAdmin) {
            throw new UnauthorizedException("Bạn không có quyền thu hồi tin nhắn này");
        }

        if (msg.isDeleted()) {
            throw new IllegalArgumentException("Tin nhắn đã được thu hồi trước đó");
        }

        msg.setDeleted(true);
        groupMessageRepository.save(msg);

        GroupMessageDto dto = toMessageDto(msg, user.getId(), Set.of());
        messagingTemplate.convertAndSend("/topic/group/" + msg.getGroup().getId(), dto);
        log.info("Group message {} recalled by {}", messageId, user.getEmail());
    }

    @Override
    @Transactional
    public void deleteGroupMessageForMe(UUID messageId, Authentication currentUser) {
        User user = getUser(currentUser);

        GroupMessage msg = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn không tồn tại: " + messageId));

        getGroupAndCheckMember(msg.getGroup().getId(), user.getId());

        if (groupMessageHiddenRepository.existsByMessageIdAndUserId(messageId, user.getId())) {
            return;
        }

        GroupMessageHidden hidden = GroupMessageHidden.builder()
                .message(msg)
                .user(user)
                .build();
        groupMessageHiddenRepository.save(hidden);
        log.info("Group message {} hidden for user {}", messageId, user.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupMessageDto> getMessages(UUID groupId, int page, int size, Authentication currentUser) {
        User user = getUser(currentUser);
        groupUnreadService.clear(groupId, user.getId());
        getGroupAndCheckMember(groupId, user.getId());

        List<GroupMessage> messages = groupMessageRepository
                .findByGroupIdAndDeletedFalseOrderByCreatedDateDesc(groupId, PageRequest.of(page, size))
                .getContent();

        List<UUID> msgIds = messages.stream().map(GroupMessage::getId).collect(Collectors.toList());

        Set<UUID> pinnedIds = pinnedGroupMessageRepository.findByGroupIdOrderByCreatedDateDesc(groupId)
                .stream().map(p -> p.getMessage().getId()).collect(Collectors.toSet());

        Set<UUID> hiddenIds = msgIds.isEmpty() ? Set.of()
                : groupMessageHiddenRepository.findHiddenMessageIds(msgIds, user.getId());

        List<GroupMessageDto> dtos = messages.stream()
                .filter(m -> !hiddenIds.contains(m.getId()))
                .map(m -> toMessageDto(m, user.getId(), pinnedIds))
                .collect(Collectors.toList());

        List<UUID> visibleMsgIds = dtos.stream().map(GroupMessageDto::getId).collect(Collectors.toList());
        if (!visibleMsgIds.isEmpty()) {
            Map<UUID, List<ReactionDto>> reactionsByMsgId = groupMessageReactionRepository
                    .findByGroupMessageIdIn(visibleMsgIds)
                    .stream()
                    .collect(Collectors.groupingBy(
                            r -> r.getGroupMessage().getId(),
                            Collectors.mapping(r -> ReactionDto.builder()
                                    .id(r.getId())
                                    .userId(r.getUser().getId())
                                    .userFullName(r.getUser().getFirstName() + " " + r.getUser().getLastName())
                                    .emoji(r.getEmoji())
                                    .createdDate(r.getCreatedDate())
                                    .build(), Collectors.toList())
                    ));

            dtos.forEach(dto -> dto.setReactions(reactionsByMsgId.getOrDefault(dto.getId(), List.of())));
        }

        return dtos;
    }

    @Override
    @Transactional(readOnly = true)
    public GroupMediaDto getGroupMedia(UUID groupId) {
        java.util.regex.Pattern urlPattern = java.util.regex.Pattern.compile(
                "https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+");

        List<GroupMediaDto.MediaItem> images = groupMessageRepository
                .findByGroupIdAndType(groupId, MessageType.IMAGE)
                .stream()
                .map(m -> GroupMediaDto.MediaItem.builder()
                        .id(m.getId())
                        .url(fileStorageService.generatePresignedUrl(m.getContent()))
                        .fileName(m.getFileName())
                        .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                        .createdDate(m.getCreatedDate())
                        .build())
                .collect(Collectors.toList());

        List<GroupMediaDto.MediaItem> videos = groupMessageRepository
                .findByGroupIdAndType(groupId, MessageType.VIDEO)
                .stream()
                .map(m -> GroupMediaDto.MediaItem.builder()
                        .id(m.getId())
                        .url(fileStorageService.generatePresignedUrl(m.getContent()))
                        .fileName(m.getFileName())
                        .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                        .createdDate(m.getCreatedDate())
                        .build())
                .collect(Collectors.toList());

        List<GroupMediaDto.MediaItem> files = groupMessageRepository
                .findByGroupIdAndTypeIn(groupId, List.of(MessageType.FILE, MessageType.AUDIO))
                .stream()
                .map(m -> GroupMediaDto.MediaItem.builder()
                        .id(m.getId())
                        .url(fileStorageService.generatePresignedUrl(m.getContent()))
                        .fileName(m.getFileName() != null ? m.getFileName() : "file")
                        .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                        .createdDate(m.getCreatedDate())
                        .build())
                .collect(Collectors.toList());

        List<GroupMediaDto.LinkItem> links = groupMessageRepository
                .findTextMessagesWithLinks(groupId)
                .stream()
                .flatMap(m -> {
                    java.util.regex.Matcher matcher = urlPattern.matcher(m.getContent());
                    List<GroupMediaDto.LinkItem> found = new java.util.ArrayList<>();
                    while (matcher.find()) {
                        found.add(GroupMediaDto.LinkItem.builder()
                                .url(matcher.group())
                                .senderName(m.getSender().getFirstName() + " " + m.getSender().getLastName())
                                .createdDate(m.getCreatedDate())
                                .build());
                    }
                    return found.stream();
                })
                .collect(Collectors.toList());

        return GroupMediaDto.builder()
                .images(images)
                .videos(videos)
                .files(files)
                .links(links)
                .build();
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Group getGroupAndCheckMember(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại với id: " + groupId));
        if (!group.isMember(userId)) {
            throw new UnauthorizedException("Bạn không phải thành viên nhóm này");
        }
        return group;
    }

    private Group getGroupAndCheckAdmin(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại với id: " + groupId));
        if (!group.isAdmin(userId)) {
            throw new UnauthorizedException("Chỉ admin mới có quyền thực hiện thao tác này");
        }
        return group;
    }

    private void broadcastGroupEvent(UUID groupId, GroupEventDto event) {
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/events", event);
    }

    private void sendSystemMessage(UUID groupId, Group group, User actor, String content) {
        GroupMessage msg = GroupMessage.builder()
                .group(group)
                .sender(actor)
                .content(content)
                .type(MessageType.SYSTEM)
                .build();
        GroupMessage saved = groupMessageRepository.save(msg);
        GroupMessageDto dto = toMessageDto(saved, actor.getId(), Set.of());
        messagingTemplate.convertAndSend("/topic/group/" + groupId, dto);
    }

    private List<GroupMessageDto> getPinnedMessageDtos(UUID groupId, UUID currentUserId) {
        return pinnedGroupMessageRepository.findByGroupIdOrderByCreatedDateDesc(groupId)
                .stream()
                .map(p -> toMessageDto(p.getMessage(), currentUserId, Set.of(p.getMessage().getId())))
                .collect(Collectors.toList());
    }

    private GroupDto toGroupDto(Group group, UUID currentUserId, boolean includePinned) {
        GroupDto dto = groupMapper.toDto(group);
        dto.setAdmin(group.isAdmin(currentUserId));

        groupMessageRepository.findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(group.getId())
                .ifPresent(last -> {
                    dto.setLastMessage(last.getContent());
                    dto.setLastMessageType(last.getType());
                    dto.setLastMessageTime(last.getCreatedDate());
                    dto.setLastMessageSenderName(
                            last.getSender().getFirstName() + " " + last.getSender().getLastName()
                    );
                });

        if (includePinned) {
            dto.setPinnedMessages(getPinnedMessageDtos(group.getId(), currentUserId));
        }

        return dto;
    }

    private GroupMessageDto toMessageDto(GroupMessage msg, UUID currentUserId, Set<UUID> pinnedIds) {
        GroupMessageDto dto = groupMapper.toMessageDto(msg);
        dto.setMine(msg.getSender().getId().equals(currentUserId));
        dto.setPinned(pinnedIds != null && pinnedIds.contains(msg.getId()));

        boolean isMedia = msg.getType() != null
                && msg.getType() != MessageType.TEXT
                && msg.getType() != MessageType.SYSTEM;
        String rawContent = msg.getContent();
        if (!msg.isDeleted() && isMedia && rawContent != null) {
            dto.setMediaUrl(fileStorageService.generatePresignedUrl(rawContent));
            dto.setContent(null);
        } else if (msg.isDeleted()) {
            dto.setContent(null);
            dto.setMediaUrl(null);
        }

        return dto;
    }
}
