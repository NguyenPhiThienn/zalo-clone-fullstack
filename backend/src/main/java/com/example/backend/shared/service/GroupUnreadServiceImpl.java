package com.example.backend.shared.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Quan ly so tin nhan chua doc cua tung user trong moi nhom (Redis HASH).
 *
 * Key: "group:unread:{groupId}"  (HASH)
 * Field: "{userId}" → so luong tin nhan chua doc
 *
 * - Increment: khi co tin nhan moi trong nhom, tang count cho tat ca member tru sender
 * - Clear: khi user mo nhom (goi GET /messages), reset count cua user do ve 0
 * - Get: khi load danh sach nhom cua user, doc count de tra ve trong GroupDto
 */
@Service
@RequiredArgsConstructor
public class GroupUnreadServiceImpl implements GroupUnreadService {

    private static final String KEY_PREFIX = "group:unread:";

    private final StringRedisTemplate redisTemplate;

    @Override
    public void increment(UUID groupId, UUID userId) {
        redisTemplate.opsForHash().increment(KEY_PREFIX + groupId, userId.toString(), 1);
    }

    @Override
    public void clear(UUID groupId, UUID userId) {
        redisTemplate.opsForHash().delete(KEY_PREFIX + groupId, userId.toString());
    }

    @Override
    public int getCount(UUID groupId, UUID userId) {
        Object val = redisTemplate.opsForHash().get(KEY_PREFIX + groupId, userId.toString());
        if (val == null) return 0;
        try { return Integer.parseInt(val.toString()); } catch (NumberFormatException e) { return 0; }
    }

    @Override
    public void deleteGroup(UUID groupId) {
        redisTemplate.delete(KEY_PREFIX + groupId);
    }
}
