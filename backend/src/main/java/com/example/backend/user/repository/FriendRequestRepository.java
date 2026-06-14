package com.example.backend.user.repository;

import com.example.backend.user.entity.FriendRequest;
import com.example.backend.user.entity.FriendRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, UUID> {

    @Query("SELECT fr FROM FriendRequest fr WHERE " +
            "(fr.sender.id = :u1 AND fr.receiver.id = :u2) OR " +
            "(fr.sender.id = :u2 AND fr.receiver.id = :u1)")
    Optional<FriendRequest> findBetweenUsers(@Param("u1") UUID u1, @Param("u2") UUID u2);

    List<FriendRequest> findByReceiverIdAndStatus(UUID receiverId, FriendRequestStatus status);

    List<FriendRequest> findBySenderIdAndStatus(UUID senderId, FriendRequestStatus status);

    @Query("SELECT fr FROM FriendRequest fr WHERE " +
            "(fr.sender.id = :userId OR fr.receiver.id = :userId) AND fr.status = 'ACCEPTED'")
    List<FriendRequest> findAcceptedFriendships(@Param("userId") UUID userId);

    @Query("SELECT COUNT(fr) > 0 FROM FriendRequest fr WHERE " +
            "((fr.sender.id = :u1 AND fr.receiver.id = :u2) OR " +
            "(fr.sender.id = :u2 AND fr.receiver.id = :u1)) AND fr.status = 'ACCEPTED'")
    boolean areFriends(@Param("u1") UUID u1, @Param("u2") UUID u2);
}
