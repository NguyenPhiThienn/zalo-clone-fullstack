package com.example.backend.group.repository;

import com.example.backend.group.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    // Lấy tất cả nhóm mà user là thành viên
    // JOIN FETCH toàn bộ members + user + createdBy để tránh N+1 queries
    @Query("""
        SELECT DISTINCT g FROM Group g
        LEFT JOIN FETCH g.members gm
        LEFT JOIN FETCH gm.user
        LEFT JOIN FETCH g.createdBy
        WHERE EXISTS (
            SELECT m FROM GroupMember m
            WHERE m.group = g AND m.user.id = :userId
        )
        ORDER BY g.createdDate DESC
    """)
    List<Group> findAllGroupsByUserId(@Param("userId") UUID userId);

    @Query("SELECT DATE(g.createdDate), COUNT(g) FROM Group g WHERE g.createdDate >= :since GROUP BY DATE(g.createdDate)")
    List<Object[]> countDailyNewGroups(@Param("since") Instant since);
}