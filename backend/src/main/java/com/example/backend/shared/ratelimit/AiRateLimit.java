package com.example.backend.shared.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Ap dung len method cua @RestController de gioi han so AI request moi phut.
 * Gioi han lay tu app.redis.ai-rate-limit (default 10 request/phut/user).
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AiRateLimit {
}
