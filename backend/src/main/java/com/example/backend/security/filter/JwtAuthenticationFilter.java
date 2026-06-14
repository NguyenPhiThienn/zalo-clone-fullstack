package com.example.backend.security.filter;

import com.example.backend.security.service.JwtService;
import com.example.backend.shared.service.TokenBlacklistService;
import com.example.backend.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final TokenBlacklistService tokenBlacklistService;

    private static final List<String> SKIP_PATHS = List.of(
            "/swagger-ui",
            "/v3/api-docs",
            "/ws",
            "/api/v1/message/media",
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return SKIP_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (StringUtils.hasText(token)) {
            try {
                if (jwtService.isTokenValid(token) && jwtService.isAccessToken(token)) {
                    // Kiem tra blacklist truoc (logout tuong minh)
                    if (tokenBlacklistService.isBlacklisted(token)) {
                        log.warn("Blacklisted token used for: {}", request.getRequestURI());
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"TOKEN_REVOKED\"}");
                        return;
                    }
                    String email = jwtService.extractEmail(token);
                    int tokenVersion = jwtService.extractTokenVersion(token);

                    // Kiểm tra tokenVersion + ban status từ DB
                    var userOpt = userRepository.findByEmail(email);
                    if (userOpt.isEmpty()) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"USER_NOT_FOUND\"}");
                        return;
                    }
                    var user = userOpt.get();

                    if (user.getTokenVersion() != tokenVersion) {
                        log.warn("Token version mismatch for user: {} — session đã bị thay thế", email);
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"SESSION_REPLACED\"}");
                        return;
                    }

                    if (user.isBanned()) {
                        // Auto-unban nếu hết hạn
                        if (user.getBanUntil() != null && LocalDateTime.now().isAfter(user.getBanUntil())) {
                            user.setBanned(false);
                            user.setBanReason(null);
                            user.setBanUntil(null);
                            user.setBannedAt(null);
                            userRepository.save(user);
                        } else {
                            log.warn("Banned user attempted access: {}", email);
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json; charset=UTF-8");
                            String reason = user.getBanReason() != null
                                    ? user.getBanReason().replace("\"", "'") : "";
                            response.getWriter().write(
                                    "{\"error\":\"ACCOUNT_BANNED\",\"reason\":\"" + reason + "\"}");
                            return;
                        }
                    }

                    String role = jwtService.extractRole(token);
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            );

                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug("Authenticated user: {}", email);
                }
            } catch (Exception e) {
                log.warn("JWT authentication failed for {}: {}", request.getRequestURI(), e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}