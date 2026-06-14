package com.example.backend.group.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.backend.group.dto.GroupDto;
import com.example.backend.group.dto.GroupJoinRequestDto;
import com.example.backend.group.dto.GroupMediaDto;
import com.example.backend.group.dto.GroupMessageDto;
import com.example.backend.group.dto.GroupRequest;
import com.example.backend.group.service.GroupService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/group")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    /** POST /api/v1/group */
    @PostMapping
    public ResponseEntity<GroupDto> createGroup(
            @Valid @RequestBody GroupRequest.Create request,
            Authentication currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.createGroup(request, currentUser));
    }

    /** GET /api/v1/group */
    @GetMapping
    public ResponseEntity<List<GroupDto>> getMyGroups(Authentication currentUser) {
        return ResponseEntity.ok(groupService.getMyGroups(currentUser));
    }

    /** GET /api/v1/group/{groupId} */
    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDto> getGroup(
            @PathVariable UUID groupId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.getGroupById(groupId, currentUser));
    }

    /** PUT /api/v1/group/{groupId} */
    @PutMapping("/{groupId}")
    public ResponseEntity<GroupDto> updateGroup(
            @PathVariable UUID groupId,
            @Valid @RequestBody GroupRequest.Update request,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.updateGroup(groupId, request, currentUser));
    }

    /** POST /api/v1/group/{groupId}/avatar */
    @PostMapping(value = "/{groupId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GroupDto> uploadGroupAvatar(
            @PathVariable UUID groupId,
            @RequestParam("file") MultipartFile file,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.uploadGroupAvatar(groupId, file, currentUser));
    }

    /** POST /api/v1/group/{groupId}/members */
    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupDto> addMembers(
            @PathVariable UUID groupId,
            @Valid @RequestBody GroupRequest.AddMember request,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.addMembers(groupId, request, currentUser));
    }

    /** DELETE /api/v1/group/{groupId}/members/{userId} */
    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            Authentication currentUser) {
        groupService.removeMember(groupId, userId, currentUser);
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/v1/group/{groupId}/leave?newAdminId={uuid} */
    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<Void> leaveGroup(
            @PathVariable UUID groupId,
            @RequestParam(required = false) UUID newAdminId,
            Authentication currentUser) {
        groupService.leaveGroup(groupId, newAdminId, currentUser);
        return ResponseEntity.ok().build();
    }

    /** PATCH /api/v1/group/{groupId}/members/{userId}/set-admin */
    @PatchMapping("/{groupId}/members/{userId}/set-admin")
    public ResponseEntity<GroupDto> setMemberAsAdmin(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.setMemberAsAdmin(groupId, userId, currentUser));
    }

    /** DELETE /api/v1/group/{groupId}/dissolve */
    @DeleteMapping("/{groupId}/dissolve")
    public ResponseEntity<Void> dissolveGroup(
            @PathVariable UUID groupId,
            Authentication currentUser) {
        groupService.dissolveGroup(groupId, currentUser);
        return ResponseEntity.ok().build();
    }

    /** POST /api/v1/group/{groupId}/join-requests */
    @PostMapping("/{groupId}/join-requests")
    public ResponseEntity<List<GroupJoinRequestDto>> createJoinRequests(
            @PathVariable UUID groupId,
            @Valid @RequestBody GroupRequest.AddMember request,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.createJoinRequests(groupId, request.getUserIds(), currentUser));
    }

    /** GET /api/v1/group/{groupId}/join-requests */
    @GetMapping("/{groupId}/join-requests")
    public ResponseEntity<List<GroupJoinRequestDto>> getJoinRequests(
            @PathVariable UUID groupId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.getJoinRequests(groupId, currentUser));
    }

    /** PUT /api/v1/group/{groupId}/join-requests/{requestId}/approve */
    @PutMapping("/{groupId}/join-requests/{requestId}/approve")
    public ResponseEntity<GroupDto> approveJoinRequest(
            @PathVariable UUID groupId,
            @PathVariable UUID requestId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.approveJoinRequest(groupId, requestId, currentUser));
    }

    /** PUT /api/v1/group/{groupId}/join-requests/{requestId}/reject */
    @PutMapping("/{groupId}/join-requests/{requestId}/reject")
    public ResponseEntity<Void> rejectJoinRequest(
            @PathVariable UUID groupId,
            @PathVariable UUID requestId,
            Authentication currentUser) {
        groupService.rejectJoinRequest(groupId, requestId, currentUser);
        return ResponseEntity.ok().build();
    }

    /** POST /api/v1/group/{groupId}/messages/{messageId}/pin */
    @PostMapping("/{groupId}/messages/{messageId}/pin")
    public ResponseEntity<List<GroupMessageDto>> pinMessage(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.pinMessage(groupId, messageId, currentUser));
    }

    /** DELETE /api/v1/group/{groupId}/messages/{messageId}/pin */
    @DeleteMapping("/{groupId}/messages/{messageId}/pin")
    public ResponseEntity<List<GroupMessageDto>> unpinMessage(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.unpinMessage(groupId, messageId, currentUser));
    }

    /** GET /api/v1/group/{groupId}/pinned-messages */
    @GetMapping("/{groupId}/pinned-messages")
    public ResponseEntity<List<GroupMessageDto>> getPinnedMessages(
            @PathVariable UUID groupId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.getPinnedMessages(groupId, currentUser));
    }

    /** POST /api/v1/group/{groupId}/messages */
    @PostMapping("/{groupId}/messages")
    public ResponseEntity<GroupMessageDto> sendMessage(
            @PathVariable UUID groupId,
            @Valid @RequestBody GroupRequest.SendMessage request,
            Authentication currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.sendMessage(groupId, request, currentUser));
    }

    /** POST /api/v1/group/{groupId}/upload-media */
    @PostMapping(value = "/{groupId}/upload-media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GroupMessageDto> uploadGroupMedia(
            @PathVariable UUID groupId,
            @RequestParam("file") MultipartFile file,
            Authentication currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.uploadGroupMediaMessage(groupId, file, currentUser));
    }

    /** DELETE /api/v1/group/{groupId}/messages/{messageId}/recall */
    @DeleteMapping("/{groupId}/messages/{messageId}/recall")
    public ResponseEntity<Void> recallGroupMessage(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            Authentication currentUser) {
        groupService.recallGroupMessage(messageId, currentUser);
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/v1/group/{groupId}/messages/{messageId} */
    @DeleteMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<Void> deleteGroupMessageForMe(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            Authentication currentUser) {
        groupService.deleteGroupMessageForMe(messageId, currentUser);
        return ResponseEntity.ok().build();
    }

    /** GET /api/v1/group/{groupId}/messages?page=0&size=30 */
    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<GroupMessageDto>> getMessages(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.getMessages(groupId, page, size, currentUser));
    }

    /** GET /api/v1/group/{groupId}/media — Ảnh, video, file, link đã gửi trong nhóm */
    @GetMapping("/{groupId}/media")
    public ResponseEntity<GroupMediaDto> getGroupMedia(
            @PathVariable UUID groupId,
            Authentication currentUser) {
        return ResponseEntity.ok(groupService.getGroupMedia(groupId));
    }
}
