package com.example.backend.shared.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Quan ly trang thai online/offline cua user qua Redis TTL.
 * Key: "user:online:{userId}" — value "1", TTL = app.redis.online-ttl-seconds (default 120s)
 * Frontend phai goi POST /api/v1/user/heartbeat moi 60s de refresh TTL.
 */
@Service
@RequiredArgsConstructor
public class OnlineStatusServiceImpl implements OnlineStatusService {

    private static final String KEY_PREFIX = "user:online:";

    private final StringRedisTemplate redisTemplate;

    @Value("${app.redis.online-ttl-seconds:120}")
    private long ttlSeconds;

    @Override
    public void setOnline(UUID userId) {
        redisTemplate.opsForValue()
                .set(KEY_PREFIX + userId, "1", Duration.ofSeconds(ttlSeconds));
    }

    @Override
    public void setOffline(UUID userId) {
        redisTemplate.delete(KEY_PREFIX + userId);
    }

    @Override
    public boolean isOnline(UUID userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + userId));
    }

    @Override
    public void refreshTtl(UUID userId) {
        redisTemplate.expire(KEY_PREFIX + userId, Duration.ofSeconds(ttlSeconds));
    }
}
