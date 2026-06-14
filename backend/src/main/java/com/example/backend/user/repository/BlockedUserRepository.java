package com.example.backend.user.repository;

import com.example.backend.user.entity.BlockedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BlockedUserRepository extends JpaRepository<BlockedUser, UUID> {

    Optional<BlockedUser> findByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);

    boolean existsByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);

    List<BlockedUser> findAllByBlockerId(UUID blockerId);

    @Query("SELECT COUNT(b) > 0 FROM BlockedUser b WHERE " +
            "(b.blocker.id = :u1 AND b.blocked.id = :u2) OR " +
            "(b.blocker.id = :u2 AND b.blocked.id = :u1)")
    boolean isBlockedBetween(@Param("u1") UUID u1, @Param("u2") UUID u2);
}
