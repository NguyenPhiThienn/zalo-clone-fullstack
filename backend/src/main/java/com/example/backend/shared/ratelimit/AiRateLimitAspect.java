package com.example.backend.shared.ratelimit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Map;

/**
 * AOP aspect kiem tra rate limit truoc khi thuc hien AI endpoint.
 * Method phai co tham so Authentication de lay userId.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AiRateLimitAspect {

    private final AiRateLimitService rateLimitService;

    @Around("@annotation(com.example.backend.shared.ratelimit.AiRateLimit)")
    public Object checkRateLimit(ProceedingJoinPoint joinPoint) throws Throwable {
        // Tim tham so Authentication trong args
        Authentication auth = Arrays.stream(joinPoint.getArgs())
                .filter(arg -> arg instanceof Authentication)
                .map(arg -> (Authentication) arg)
                .findFirst()
                .orElse(null);

        if (auth == null) {
            log.warn("@AiRateLimit khong tim thay Authentication trong method args");
            return joinPoint.proceed();
        }

        String userId = auth.getName(); // email (dung nhu userId de phan biet user)

        try {
            if (!rateLimitService.tryConsume(userId)) {
                log.warn("AI rate limit vuot qua cho user: {}", userId);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of(
                            "error", "RATE_LIMIT_EXCEEDED",
                            "message", "Ban da vuot qua gioi han AI request. Vui long thu lai sau 1 phut."
                        ));
            }
        } catch (Exception e) {
            log.error("Error during rate limiting check: {}. Proceeding without limit.", e.getMessage());
        }

        return joinPoint.proceed();
    }
}
