package com.example.backend.shared.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Sliding-window rate limiter dung Redis INCR + EXPIRE.
 * Window 60 giay, gioi han so request lay tu config.
 */
@Service
@RequiredArgsConstructor
public class AiRateLimitService {

    private static final String KEY_PREFIX = "ai:rate:";
    private static final long WINDOW_SECONDS = 60;

    private final StringRedisTemplate redisTemplate;

    @Value("${app.redis.ai-rate-limit:10}")
    private int maxRequests;

    /**
     * Tang dem va tra ve true neu van con trong gioi han.
     * @param userId UUID cua user dang goi AI.
     */
    public boolean tryConsume(String userId) {
        String key = KEY_PREFIX + userId;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) return false;
        if (count == 1) {
            // Key vua duoc tao - dat TTL
            redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
        }
        return count <= maxRequests;
    }

    /** So request con lai trong window hien tai. */
    public int remaining(String userId) {
        String val = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
        if (val == null) return maxRequests;
        int used = Integer.parseInt(val);
        return Math.max(0, maxRequests - used);
    }
}
