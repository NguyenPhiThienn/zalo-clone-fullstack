package com.example.backend.services;

import com.example.backend.security.service.JwtService;
import com.example.backend.security.service.JwtServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DisplayName("JwtService Unit Tests")
class JwtServiceTest {

    private JwtServiceImpl jwtService;

    private static final String SECRET  = "zalo-clone-test-secret-key-min32chars!!";
    private static final String EMAIL   = "test@gmail.com";
    private static final String USER_ID = UUID.randomUUID().toString();

    @BeforeEach
    void setUp() {
        jwtService = new JwtServiceImpl();
        ReflectionTestUtils.setField(jwtService, "secretKey",             SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs",          86400000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpirationMs",   604800000L);
    }

    // ─── generateAccessToken ──────────────────────────────────────────────────

    @Test
    @DisplayName("Tạo access token thành công")
    void generateAccessToken_success() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 1);
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("Access token hợp lệ sau khi tạo")
    void isTokenValid_freshToken_isTrue() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 1);
        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    @DisplayName("Token rác → isTokenValid = false")
    void isTokenValid_garbage_isFalse() {
        assertThat(jwtService.isTokenValid("not.a.valid.token")).isFalse();
    }

    @Test
    @DisplayName("Token rỗng → isTokenValid = false")
    void isTokenValid_empty_isFalse() {
        assertThat(jwtService.isTokenValid("")).isFalse();
    }

    // ─── extractEmail ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("extractEmail() trả về đúng email")
    void extractEmail_success() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 1);
        assertThat(jwtService.extractEmail(token)).isEqualTo(EMAIL);
    }

    // ─── extractUserId ────────────────────────────────────────────────────────

    @Test
    @DisplayName("extractUserId() trả về subject là email (subject = email trong buildToken)")
    void extractUserId_returnsSubject() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 1);
        // Subject được set là email trong buildToken
        assertThat(jwtService.extractUserId(token)).isEqualTo(EMAIL);
    }

    // ─── isAccessToken ────────────────────────────────────────────────────────

    @Test
    @DisplayName("isAccessToken() = true cho access token")
    void isAccessToken_accessToken_isTrue() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 1);
        assertThat(jwtService.isAccessToken(token)).isTrue();
    }

    @Test
    @DisplayName("isAccessToken() = false cho refresh token")
    void isAccessToken_refreshToken_isFalse() {
        String token = jwtService.generateRefreshToken(EMAIL, USER_ID, 1);
        assertThat(jwtService.isAccessToken(token)).isFalse();
    }

    // ─── generateRefreshToken ─────────────────────────────────────────────────

    @Test
    @DisplayName("Refresh token hợp lệ và extract email đúng")
    void generateRefreshToken_validAndEmailCorrect() {
        String token = jwtService.generateRefreshToken(EMAIL, USER_ID, 1);
        assertThat(jwtService.isTokenValid(token)).isTrue();
        assertThat(jwtService.extractEmail(token)).isEqualTo(EMAIL);
    }

    // ─── extractTokenVersion ─────────────────────────────────────────────────

    @Test
    @DisplayName("extractTokenVersion() trả về đúng version")
    void extractTokenVersion_success() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 5);
        assertThat(jwtService.extractTokenVersion(token)).isEqualTo(5);
    }

    @Test
    @DisplayName("extractTokenVersion() từ refresh token")
    void extractTokenVersion_fromRefreshToken() {
        String token = jwtService.generateRefreshToken(EMAIL, USER_ID, 3);
        assertThat(jwtService.extractTokenVersion(token)).isEqualTo(3);
    }

    // ─── extractRole ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("extractRole() trả về đúng role USER")
    void extractRole_user() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "USER", 1);
        assertThat(jwtService.extractRole(token)).isEqualTo("USER");
    }

    @Test
    @DisplayName("extractRole() trả về đúng role ADMIN")
    void extractRole_admin() {
        String token = jwtService.generateAccessToken(EMAIL, USER_ID, "ADMIN", 1);
        assertThat(jwtService.extractRole(token)).isEqualTo("ADMIN");
    }
}
