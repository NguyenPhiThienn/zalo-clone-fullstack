package com.example.backend.services;

import com.example.backend.ai.service.GroupAiService;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.group.dto.GroupDto;
import com.example.backend.group.dto.GroupMessageDto;
import com.example.backend.group.dto.GroupRequest;
import com.example.backend.group.entity.Group;
import com.example.backend.group.entity.GroupMember;
import com.example.backend.group.entity.GroupMessage;
import com.example.backend.group.repository.GroupJoinRequestRepository;
import com.example.backend.group.repository.GroupMemberRepository;
import com.example.backend.group.repository.GroupMessageHiddenRepository;
import com.example.backend.group.repository.GroupMessageReactionRepository;
import com.example.backend.group.repository.GroupMessageRepository;
import com.example.backend.group.repository.GroupRepository;
import com.example.backend.group.repository.PinnedGroupMessageRepository;
import com.example.backend.group.service.GroupService;
import com.example.backend.group.service.GroupServiceImpl;
import com.example.backend.shared.service.GroupUnreadService;
import com.example.backend.group.mapper.GroupMapper;
import com.example.backend.messaging.enums.MessageType;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GroupService Unit Tests")
class GroupServiceTest {

    @Mock GroupRepository groupRepository;
    @Mock GroupMemberRepository groupMemberRepository;
    @Mock GroupMessageRepository groupMessageRepository;
    @Mock GroupMessageReactionRepository groupMessageReactionRepository;
    @Mock PinnedGroupMessageRepository pinnedGroupMessageRepository;
    @Mock GroupMessageHiddenRepository groupMessageHiddenRepository;
    @Mock GroupJoinRequestRepository groupJoinRequestRepository;
    @Mock UserRepository userRepository;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock FileStorageService fileStorageService;
    @Mock GroupAiService groupAiService;
    @Mock Authentication authentication;
    @Mock GroupUnreadService groupUnreadService;
    @Mock GroupMapper groupMapper;
    @InjectMocks GroupServiceImpl groupService;

    private User creator;
    private User member1;
    private User member2;
    private Group group;
    private UUID groupId;
    private GroupDto groupDto;
    private GroupMessageDto groupMessageDto;

    @BeforeEach
    void setUp() {
        groupId = UUID.randomUUID();

        creator = new User();
        creator.setId(UUID.randomUUID());
        creator.setEmail("creator@gmail.com");
        creator.setFirstName("Creator");
        creator.setLastName("User");

        member1 = new User();
        member1.setId(UUID.randomUUID());
        member1.setEmail("member1@gmail.com");
        member1.setFirstName("Member");
        member1.setLastName("One");

        member2 = new User();
        member2.setId(UUID.randomUUID());
        member2.setEmail("member2@gmail.com");
        member2.setFirstName("Member");
        member2.setLastName("Two");

        group = new Group();
        group.setId(groupId);
        group.setName("Test Group");
        group.setCreatedBy(creator);
        group.setMembers(new ArrayList<>(List.of(
                GroupMember.of(group, creator, true),
                GroupMember.of(group, member1, false)
        )));

        groupDto = new GroupDto();
        groupDto.setId(groupId);
        groupDto.setName("Test Group");

        groupMessageDto = new GroupMessageDto();
        groupMessageDto.setContent("Hello nhóm!");

        lenient().when(groupMapper.toDto(any(Group.class))).thenReturn(groupDto);
        lenient().when(groupMapper.toMessageDto(any(GroupMessage.class))).thenReturn(groupMessageDto);

        lenient().when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(invocation -> {
            GroupMessage message = invocation.getArgument(0);
            if (message.getId() == null) {
                message.setId(UUID.randomUUID());
            }
            return message;
        });

        lenient().when(authentication.getName()).thenReturn("creator@gmail.com");
        lenient().when(userRepository.findByEmail("creator@gmail.com")).thenReturn(Optional.of(creator));
    }

    // ─── createGroup ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createGroup() - thành công")
    void createGroup_success() {
        GroupRequest.Create req = GroupRequest.Create.builder()
                .name("Nhóm Mới")
                .description("Mô tả")
                .memberIds(List.of(member1.getId(), member2.getId()))
                .build();

        when(userRepository.findById(member1.getId())).thenReturn(Optional.of(member1));
        when(userRepository.findById(member2.getId())).thenReturn(Optional.of(member2));
        when(groupRepository.save(any())).thenReturn(group);
        lenient().when(groupMessageRepository.findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(any()))
                .thenReturn(Optional.empty());

        GroupDto result = groupService.createGroup(req, authentication);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Test Group");
        verify(groupRepository, times(2)).save(any(Group.class));
    }

    @Test
    @DisplayName("createGroup() - thành viên không tồn tại → ResourceNotFoundException")
    void createGroup_memberNotFound_throws() {
        UUID nonExistentId = UUID.randomUUID();
        GroupRequest.Create req = GroupRequest.Create.builder()
                .name("Test")
                .memberIds(List.of(nonExistentId))
                .build();

        when(groupRepository.save(any())).thenReturn(group);
        when(userRepository.findById(nonExistentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupService.createGroup(req, authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getMyGroups ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getMyGroups() - trả về danh sách nhóm")
    void getMyGroups_success() {
        when(groupRepository.findAllGroupsByUserId(creator.getId())).thenReturn(List.of(group));
        lenient().when(groupMessageRepository.findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(any()))
                .thenReturn(Optional.empty());

        List<GroupDto> result = groupService.getMyGroups(authentication);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Test Group");
    }

    @Test
    @DisplayName("getMyGroups() - không có nhóm → danh sách rỗng")
    void getMyGroups_empty() {
        when(groupRepository.findAllGroupsByUserId(creator.getId())).thenReturn(List.of());

        List<GroupDto> result = groupService.getMyGroups(authentication);

        assertThat(result).isEmpty();
    }

    // ─── addMembers ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("addMembers() - admin thêm thành viên mới")
    void addMembers_success() {
        GroupRequest.AddMember req = new GroupRequest.AddMember(List.of(member2.getId()));

        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMemberRepository.existsByGroupIdAndUserId(groupId, member2.getId())).thenReturn(false);
        when(userRepository.findById(member2.getId())).thenReturn(Optional.of(member2));
        when(groupRepository.save(any())).thenReturn(group);
        lenient().when(groupMessageRepository.findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(any()))
                .thenReturn(Optional.empty());

        GroupDto result = groupService.addMembers(groupId, req, authentication);

        assertThat(result).isNotNull();
        verify(groupRepository).save(group);
    }

    @Test
    @DisplayName("addMembers() - không phải admin → UnauthorizedException")
    void addMembers_notAdmin_throws() {
        when(authentication.getName()).thenReturn("member1@gmail.com");
        when(userRepository.findByEmail("member1@gmail.com")).thenReturn(Optional.of(member1));
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));

        GroupRequest.AddMember req = new GroupRequest.AddMember(List.of(member2.getId()));

        assertThatThrownBy(() -> groupService.addMembers(groupId, req, authentication))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("admin");
    }

    @Test
    @DisplayName("addMembers() - thành viên đã trong nhóm → bỏ qua")
    void addMembers_alreadyMember_skipped() {
        GroupRequest.AddMember req = new GroupRequest.AddMember(List.of(member1.getId()));

        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMemberRepository.existsByGroupIdAndUserId(groupId, member1.getId())).thenReturn(true);
        when(groupRepository.save(any())).thenReturn(group);
        lenient().when(groupMessageRepository.findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(any()))
                .thenReturn(Optional.empty());

        GroupDto result = groupService.addMembers(groupId, req, authentication);

        assertThat(result).isNotNull();
        verify(userRepository, never()).findById(member1.getId());
    }

    // ─── removeMember ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("removeMember() - admin xóa thành viên thành công")
    void removeMember_success() {
        GroupMember memberToRemove = GroupMember.of(group, member1, false);

        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        lenient().when(groupMemberRepository.findByGroupIdAndUserId(groupId, member1.getId()))
                .thenReturn(Optional.of(memberToRemove));

        assertThatNoException().isThrownBy(
                () -> groupService.removeMember(groupId, member1.getId(), authentication));

        verify(groupRepository).save(group);
    }

    @Test
    @DisplayName("removeMember() - admin tự xóa chính mình → throw")
    void removeMember_adminRemoveSelf_throws() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.removeMember(groupId, creator.getId(), authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("rời nhóm");
    }

    @Test
    @DisplayName("removeMember() - thành viên không tồn tại trong nhóm → ResourceNotFoundException")
    void removeMember_memberNotInGroup_throws() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        lenient().when(groupMemberRepository.findByGroupIdAndUserId(groupId, member2.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupService.removeMember(groupId, member2.getId(), authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── sendMessage ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("sendMessage() - gửi tin nhắn thành công")
    void sendMessage_success() {
        GroupRequest.SendMessage req = new GroupRequest.SendMessage("Hello nhóm!", MessageType.TEXT);

        GroupMessage savedMsg = new GroupMessage();
        savedMsg.setId(UUID.randomUUID());
        savedMsg.setContent("Hello nhóm!");
        savedMsg.setType(MessageType.TEXT);
        savedMsg.setGroup(group);
        savedMsg.setSender(creator);

        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMessageRepository.save(any())).thenReturn(savedMsg);

        GroupMessageDto result = groupService.sendMessage(groupId, req, authentication);

        assertThat(result.getContent()).isEqualTo("Hello nhóm!");
        assertThat(result.isMine()).isTrue();
        verify(messagingTemplate).convertAndSend(
                eq("/topic/group/" + groupId), any(GroupMessageDto.class));
    }

    @Test
    @DisplayName("sendMessage() - không phải thành viên → UnauthorizedException")
    void sendMessage_notMember_throws() {
        User outsider = new User();
        outsider.setId(UUID.randomUUID());
        outsider.setEmail("outsider@gmail.com");

        when(authentication.getName()).thenReturn("outsider@gmail.com");
        when(userRepository.findByEmail("outsider@gmail.com")).thenReturn(Optional.of(outsider));
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));

        GroupRequest.SendMessage req = new GroupRequest.SendMessage("Hello", MessageType.TEXT);

        assertThatThrownBy(() -> groupService.sendMessage(groupId, req, authentication))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("thành viên");
    }

    @Test
    @DisplayName("sendMessage() - nội dung rỗng → throw")
    void sendMessage_emptyContent_throws() {
        GroupRequest.SendMessage req = new GroupRequest.SendMessage("   ", MessageType.TEXT);

        lenient().when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.sendMessage(groupId, req, authentication))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── leaveGroup ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("leaveGroup() - thành viên rời nhóm thành công")
    void leaveGroup_member_success() {
        GroupMember memberRecord = GroupMember.of(group, member1, false);

        when(authentication.getName()).thenReturn("member1@gmail.com");
        when(userRepository.findByEmail("member1@gmail.com")).thenReturn(Optional.of(member1));
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        lenient().when(groupMemberRepository.findByGroupIdAndUserId(groupId, member1.getId()))
                .thenReturn(Optional.of(memberRecord));

        assertThatNoException().isThrownBy(
                () -> groupService.leaveGroup(groupId, null, authentication));

        verify(groupRepository).save(group);
    }

    @Test
    @DisplayName("leaveGroup() - admin rời nhóm khi còn thành viên khác → throw")
    void leaveGroup_adminStillHasMembers_throws() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.leaveGroup(groupId, null, authentication))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── getGroupById ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("getGroupById() - thành công")
    void getGroupById_success() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        lenient().when(groupMessageRepository.findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(any()))
                .thenReturn(Optional.empty());

        GroupDto result = groupService.getGroupById(groupId, authentication);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Test Group");
    }

    @Test
    @DisplayName("getGroupById() - nhóm không tồn tại → ResourceNotFoundException")
    void getGroupById_notFound_throws() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupService.getGroupById(groupId, authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
