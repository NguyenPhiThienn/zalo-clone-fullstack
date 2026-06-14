package com.example.backend.group.repository;

import com.example.backend.group.entity.GroupJoinRequest;
import com.example.backend.group.entity.GroupJoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, UUID> {

    List<GroupJoinRequest> findByGroupIdAndStatus(UUID groupId, GroupJoinRequestStatus status);

    Optional<GroupJoinRequest> findByGroupIdAndTargetUserIdAndStatus(
            UUID groupId, UUID targetUserId, GroupJoinRequestStatus status);
}
