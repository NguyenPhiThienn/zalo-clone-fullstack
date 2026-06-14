package com.example.backend.user.repository;

import com.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);
    List<User> findByIdNot(UUID id);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.id <> :selfId " +
            "AND (LOWER(u.firstName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<User> searchByNameOrEmail(@Param("keyword") String keyword, @Param("selfId") UUID selfId);

    Page<User> findAll(Pageable pageable);
    long countByBannedTrue();
    long countByOnlineTrue();
    long countByEmailVerifiedTrue();
    List<User> findByIdIn(List<UUID> ids);
    List<User> findByRole(String role);

    @Query("SELECT DATE(u.createdDate), COUNT(u) FROM User u WHERE u.createdDate >= :since GROUP BY DATE(u.createdDate)")
    List<Object[]> countDailyNewUsers(@Param("since") Instant since);
}
