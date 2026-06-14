package com.example.backend.services;

import com.example.backend.auth.dto.AuthRequest;
import com.example.backend.auth.dto.AuthResponse;
import com.example.backend.auth.service.AuthService;
import com.example.backend.auth.service.AuthServiceImpl;
import com.example.backend.auth.service.EmailService;
import com.example.backend.shared.service.OnlineStatusService;
import com.example.backend.shared.service.TokenBlacklistService;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.security.service.JwtService;
import com.example.backend.shared.exception.AccountBannedException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock EmailService emailService;
    @Mock NotificationService notificationService;
    @Mock OnlineStatusService onlineStatusService;
    @Mock TokenBlacklistService tokenBlacklistService;

    @InjectMocks AuthServiceImpl authService;

    private User verifiedUser;
    private User unverifiedUser;

    @BeforeEach
    void setUp() {
        verifiedUser = new User();
        verifiedUser.setId(UUID.randomUUID());
        verifiedUser.setEmail("verified@gmail.com");
        verifiedUser.setPassword("encodedPassword");
        verifiedUser.setFirstName("Verified");
        verifiedUser.setLastName("User");
        verifiedUser.setEmailVerified(true);
        verifiedUser.setOnline(false);
        verifiedUser.setTokenVersion(1);
        verifiedUser.setBanned(false);

        unverifiedUser = new User();
        unverifiedUser.setId(UUID.randomUUID());
        unverifiedUser.setEmail("unverified@gmail.com");
        unverifiedUser.setPassword("encodedPassword");
        unverifiedUser.setFirstName("Unverified");
        unverifiedUser.setLastName("User");
        unverifiedUser.setEmailVerified(false);
        unverifiedUser.setOnline(false);
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("register() - email mới → tạo user và gửi OTP")
    void register_newUser_success() {
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email("new@gmail.com").password("123456")
                .firstName("New").lastName("User").build();

        when(userRepository.existsByEmail("new@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("123456")).thenReturn("hashed");
        when(userRepository.save(any())).thenReturn(verifiedUser);
        doNothing().when(emailService).sendVerificationEmail(any(), any(), any());

        authService.register(req);

        verify(userRepository).save(any(User.class));
        verify(emailService).sendVerificationEmail(eq("new@gmail.com"), any(), any());
    }

    @Test
    @DisplayName("register() - email đã tồn tại và đã xác thực → throw IllegalArgumentException")
    void register_emailAlreadyVerified_throws() {
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email("verified@gmail.com").password("123456")
                .firstName("Test").lastName("User").build();

        when(userRepository.existsByEmail("verified@gmail.com")).thenReturn(true);
        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email đã được sử dụng");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register() - email tồn tại nhưng chưa xác thực → gửi lại OTP")
    void register_emailExistsNotVerified_resendsOtp() {
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email("unverified@gmail.com").password("123456")
                .firstName("Test").lastName("User").build();

        when(userRepository.existsByEmail("unverified@gmail.com")).thenReturn(true);
        when(userRepository.findByEmail("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        doNothing().when(emailService).sendVerificationEmail(any(), any(), any());

        authService.register(req);

        verify(emailService).sendVerificationEmail(eq("unverified@gmail.com"), any(), any());
        verify(userRepository, never()).save(any()); // user đã tồn tại, không save lại
    }

    // ─── Verify Email ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("verifyEmail() - thành công")
    void verifyEmail_success() {
        unverifiedUser.setVerificationCode("123456");
        unverifiedUser.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(5));

        AuthRequest.VerifyEmail req = new AuthRequest.VerifyEmail("unverified@gmail.com", "123456");

        when(userRepository.findByEmail("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.save(any())).thenReturn(unverifiedUser);
        when(jwtService.generateAccessToken(any(), any(), any(), anyInt())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(), any(), anyInt())).thenReturn("refresh-token");

        AuthResponse res = authService.verifyEmail(req);

        assertThat(res.getAccessToken()).isEqualTo("access-token");
        assertThat(unverifiedUser.isEmailVerified()).isTrue();
        assertThat(unverifiedUser.getVerificationCode()).isNull();
    }

    @Test
    @DisplayName("verifyEmail() - OTP sai → throw IllegalArgumentException")
    void verifyEmail_wrongCode_throws() {
        unverifiedUser.setVerificationCode("123456");
        unverifiedUser.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(5));

        AuthRequest.VerifyEmail req = new AuthRequest.VerifyEmail("unverified@gmail.com", "999999");
        when(userRepository.findByEmail("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));

        assertThatThrownBy(() -> authService.verifyEmail(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("OTP không đúng");
    }

    @Test
    @DisplayName("verifyEmail() - OTP hết hạn → throw IllegalArgumentException")
    void verifyEmail_expiredCode_throws() {
        unverifiedUser.setVerificationCode("123456");
        unverifiedUser.setVerificationCodeExpiry(LocalDateTime.now().minusMinutes(5));

        AuthRequest.VerifyEmail req = new AuthRequest.VerifyEmail("unverified@gmail.com", "123456");
        when(userRepository.findByEmail("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));

        assertThatThrownBy(() -> authService.verifyEmail(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hết hạn");
    }

    @Test
    @DisplayName("verifyEmail() - đã xác thực → throw IllegalArgumentException")
    void verifyEmail_alreadyVerified_throws() {
        AuthRequest.VerifyEmail req = new AuthRequest.VerifyEmail("verified@gmail.com", "123456");
        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.verifyEmail(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đã được xác thực");
    }

    // ─── Resend Verification ────────────────────────────────────────────────────

    @Test
    @DisplayName("resendVerification() - thành công")
    void resendVerification_success() {
        AuthRequest.ResendVerification req = new AuthRequest.ResendVerification("unverified@gmail.com");

        when(userRepository.findByEmail("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        doNothing().when(emailService).sendVerificationEmail(any(), any(), any());
        when(userRepository.save(any())).thenReturn(unverifiedUser);

        authService.resendVerification(req);

        verify(emailService).sendVerificationEmail(eq("unverified@gmail.com"), any(), any());
        verify(userRepository).save(unverifiedUser);
    }

    @Test
    @DisplayName("resendVerification() - đã xác thực → throw")
    void resendVerification_alreadyVerified_throws() {
        AuthRequest.ResendVerification req = new AuthRequest.ResendVerification("verified@gmail.com");
        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.resendVerification(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đã được xác thực");
    }

    // ─── Login ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("login() - thành công")
    void login_success() {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("verified@gmail.com").password("123456").build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(passwordEncoder.matches("123456", "encodedPassword")).thenReturn(true);
        when(userRepository.save(any())).thenReturn(verifiedUser);
        when(jwtService.generateAccessToken(any(), any(), any(), anyInt())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(), any(), anyInt())).thenReturn("refresh-token");

        AuthResponse res = authService.login(req);

        assertThat(res.getAccessToken()).isEqualTo("access-token");
        assertThat(res.getEmail()).isEqualTo("verified@gmail.com");
        verify(onlineStatusService).setOnline(verifiedUser.getId());
        verify(notificationService).sendForceLogout(eq("verified@gmail.com"), any());
    }

    @Test
    @DisplayName("login() - sai mật khẩu → BadCredentialsException")
    void login_wrongPassword_throws() {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("verified@gmail.com").password("wrong").build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(passwordEncoder.matches("wrong", "encodedPassword")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("login() - email không tồn tại → BadCredentialsException")
    void login_emailNotFound_throws() {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("nobody@gmail.com").password("123456").build();

        when(userRepository.findByEmail("nobody@gmail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("login() - tài khoản bị ban vĩnh viễn → AccountBannedException")
    void login_permanentBan_throws() {
        verifiedUser.setBanned(true);
        verifiedUser.setBanReason("Vi phạm");
        verifiedUser.setBanUntil(null); // permanent

        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("verified@gmail.com").password("123456").build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(passwordEncoder.matches("123456", "encodedPassword")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(AccountBannedException.class);
    }

    @Test
    @DisplayName("login() - ban đã hết hạn → tự động unban và đăng nhập")
    void login_expiredBan_autoUnban() {
        verifiedUser.setBanned(true);
        verifiedUser.setBanReason("Tạm thời");
        verifiedUser.setBanUntil(LocalDateTime.now().minusDays(1)); // đã hết

        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("verified@gmail.com").password("123456").build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(passwordEncoder.matches("123456", "encodedPassword")).thenReturn(true);
        when(userRepository.save(any())).thenReturn(verifiedUser);
        when(jwtService.generateAccessToken(any(), any(), any(), anyInt())).thenReturn("token");
        when(jwtService.generateRefreshToken(any(), any(), anyInt())).thenReturn("refresh");

        AuthResponse res = authService.login(req);

        assertThat(verifiedUser.isBanned()).isFalse();
        assertThat(res.getAccessToken()).isEqualTo("token");
    }

    @Test
    @DisplayName("login() - chưa xác thực email → BadCredentialsException")
    void login_emailNotVerified_throws() {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("unverified@gmail.com").password("123456").build();

        when(userRepository.findByEmail("unverified@gmail.com")).thenReturn(Optional.of(unverifiedUser));
        when(passwordEncoder.matches("123456", "encodedPassword")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("chưa được xác thực");
    }

    // ─── Forgot Password ────────────────────────────────────────────────────────

    @Test
    @DisplayName("forgotPassword() - thành công")
    void forgotPassword_success() {
        AuthRequest.ForgotPassword req = new AuthRequest.ForgotPassword("verified@gmail.com");

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(userRepository.save(any())).thenReturn(verifiedUser);
        doNothing().when(emailService).sendResetPasswordEmail(any(), any(), any());

        authService.forgotPassword(req);

        assertThat(verifiedUser.getResetPasswordCode()).isNotBlank();
        assertThat(verifiedUser.getResetPasswordCodeExpiry()).isAfter(LocalDateTime.now());
        verify(emailService).sendResetPasswordEmail(eq("verified@gmail.com"), any(), any());
    }

    @Test
    @DisplayName("forgotPassword() - tài khoản bị ban → throw")
    void forgotPassword_bannedUser_throws() {
        verifiedUser.setBanned(true);
        AuthRequest.ForgotPassword req = new AuthRequest.ForgotPassword("verified@gmail.com");

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.forgotPassword(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bị khóa");
    }

    // ─── Reset Password ────────────────────────────────────────────────────────

    @Test
    @DisplayName("resetPassword() - thành công")
    void resetPassword_success() {
        verifiedUser.setResetPasswordCode("654321");
        verifiedUser.setResetPasswordCodeExpiry(LocalDateTime.now().plusMinutes(5));

        AuthRequest.ResetPassword req = AuthRequest.ResetPassword.builder()
                .email("verified@gmail.com")
                .code("654321")
                .newPassword("NewPass@123")
                .build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(passwordEncoder.encode("NewPass@123")).thenReturn("newHashed");
        when(userRepository.save(any())).thenReturn(verifiedUser);

        authService.resetPassword(req);

        assertThat(verifiedUser.getPassword()).isEqualTo("newHashed");
        assertThat(verifiedUser.getResetPasswordCode()).isNull();
    }

    @Test
    @DisplayName("resetPassword() - mã OTP sai → throw")
    void resetPassword_wrongCode_throws() {
        verifiedUser.setResetPasswordCode("654321");
        verifiedUser.setResetPasswordCodeExpiry(LocalDateTime.now().plusMinutes(5));

        AuthRequest.ResetPassword req = AuthRequest.ResetPassword.builder()
                .email("verified@gmail.com")
                .code("000000")
                .newPassword("NewPass@123")
                .build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.resetPassword(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("OTP không đúng");
    }

    @Test
    @DisplayName("resetPassword() - OTP hết hạn → throw")
    void resetPassword_expiredCode_throws() {
        verifiedUser.setResetPasswordCode("654321");
        verifiedUser.setResetPasswordCodeExpiry(LocalDateTime.now().minusMinutes(5));

        AuthRequest.ResetPassword req = AuthRequest.ResetPassword.builder()
                .email("verified@gmail.com")
                .code("654321")
                .newPassword("NewPass@123")
                .build();

        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.resetPassword(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hết hạn");
    }

    // ─── Refresh Token ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("refreshToken() - thành công")
    void refreshToken_success() {
        AuthRequest.RefreshToken req = new AuthRequest.RefreshToken("valid-refresh-token");

        when(jwtService.isTokenValid("valid-refresh-token")).thenReturn(true);
        when(jwtService.extractEmail("valid-refresh-token")).thenReturn("verified@gmail.com");
        when(jwtService.extractTokenVersion("valid-refresh-token")).thenReturn(1);
        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(jwtService.generateAccessToken(any(), any(), any(), anyInt())).thenReturn("new-access");
        when(jwtService.generateRefreshToken(any(), any(), anyInt())).thenReturn("new-refresh");

        AuthResponse res = authService.refreshToken(req);

        assertThat(res.getAccessToken()).isEqualTo("new-access");
        assertThat(res.getRefreshToken()).isEqualTo("new-refresh");
    }

    @Test
    @DisplayName("refreshToken() - token không hợp lệ → BadCredentialsException")
    void refreshToken_invalidToken_throws() {
        AuthRequest.RefreshToken req = new AuthRequest.RefreshToken("expired-token");
        when(jwtService.isTokenValid("expired-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refreshToken(req))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("refreshToken() - tokenVersion không khớp → SESSION_REPLACED")
    void refreshToken_tokenVersionMismatch_throws() {
        AuthRequest.RefreshToken req = new AuthRequest.RefreshToken("old-token");

        when(jwtService.isTokenValid("old-token")).thenReturn(true);
        when(jwtService.extractEmail("old-token")).thenReturn("verified@gmail.com");
        when(jwtService.extractTokenVersion("old-token")).thenReturn(0); // user hiện tại là 1
        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));

        assertThatThrownBy(() -> authService.refreshToken(req))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("SESSION_REPLACED");
    }

    // ─── Logout ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("logout() - thành công")
    void logout_success() {
        when(userRepository.findByEmail("verified@gmail.com")).thenReturn(Optional.of(verifiedUser));
        when(userRepository.save(any())).thenReturn(verifiedUser);

        authService.logout("verified@gmail.com", "mock-token");

        assertThat(verifiedUser.isOnline()).isFalse();
        verify(userRepository).save(verifiedUser);
    }

    @Test
    @DisplayName("logout() - email không tồn tại → không làm gì")
    void logout_emailNotFound_noOp() {
        when(userRepository.findByEmail("nobody@gmail.com")).thenReturn(Optional.empty());

        assertThatNoException().isThrownBy(() -> authService.logout("nobody@gmail.com", "mock-token"));
        verify(userRepository, never()).save(any());
    }
}
