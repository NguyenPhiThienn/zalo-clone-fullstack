package com.example.backend.auth.service;

import com.example.backend.auth.dto.AuthRequest;
import com.example.backend.auth.dto.AuthResponse;
import com.example.backend.security.service.JwtService;
import com.example.backend.shared.exception.AccountBannedException;
import com.example.backend.shared.service.OnlineStatusService;
import com.example.backend.shared.service.TokenBlacklistService;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.messaging.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final OnlineStatusService onlineStatusService;
    private final TokenBlacklistService tokenBlacklistService;

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 1;

    @Override
    @Transactional
    public void register(AuthRequest.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            User existing = userRepository.findByEmail(request.getEmail()).get();
            if (!existing.isEmailVerified()) {
                sendVerificationCode(existing);
                return;
            }
            throw new IllegalArgumentException("Email đã được sử dụng: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName() != null ? request.getLastName() : "")
                .online(false)
                .lastSeen(LocalDateTime.now())
                .emailVerified(false)
                .build();

        sendVerificationCode(user);
        userRepository.save(user);
        log.info("User đã đăng ký, đang chờ xác thực email: {}", user.getEmail());
    }

    @Override
    @Transactional
    public AuthResponse verifyEmail(AuthRequest.VerifyEmail request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email không tồn tại"));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Tài khoản đã được xác thực");
        }
        if (user.getVerificationCode() == null
                || !user.getVerificationCode().equals(request.getCode())) {
            throw new IllegalArgumentException("Mã OTP không đúng");
        }
        if (user.getVerificationCodeExpiry() == null
                || LocalDateTime.now().isAfter(user.getVerificationCodeExpiry())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        log.info("Email đã xác thực thành công: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public void resendVerification(AuthRequest.ResendVerification request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email không tồn tại"));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Tài khoản đã được xác thực");
        }

        sendVerificationCode(user);
        userRepository.save(user);
        log.info("Đã gửi lại mã xác thực đến: {}", user.getEmail());
    }

    @Override
    @Transactional
    public AuthResponse login(AuthRequest.Login request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Email hoặc mật khẩu không đúng");
        }
        if (user.isBanned()) {
            if (user.getBanUntil() != null && LocalDateTime.now().isAfter(user.getBanUntil())) {
                user.setBanned(false);
                user.setBanReason(null);
                user.setBanUntil(null);
                user.setBannedAt(null);
                userRepository.save(user);
            } else {
                throw new AccountBannedException(user.getBanReason(), user.getBanUntil(), user.getBannedAt());
            }
        }
        if (!user.isEmailVerified()) {
            throw new BadCredentialsException("Tài khoản chưa được xác thực. Vui lòng kiểm tra email");
        }

        notificationService.sendForceLogout(user.getEmail(), "SESSION_REPLACED");

        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);
        onlineStatusService.setOnline(user.getId());

        log.info("User đã đăng nhập: {}", user.getEmail());
        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public void forgotPassword(AuthRequest.ForgotPassword request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email không tồn tại trong hệ thống"));

        if (user.isBanned()) {
            throw new IllegalArgumentException("Tài khoản của bạn đã bị khóa");
        }

        String code = generateOtp();
        user.setResetPasswordCode(code);
        user.setResetPasswordCodeExpiry(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        userRepository.save(user);

        emailService.sendResetPasswordEmail(user.getEmail(), user.getFirstName(), code);
        log.info("Đã gửi mã đặt lại mật khẩu đến: {}", user.getEmail());
    }

    @Override
    @Transactional
    public void resetPassword(AuthRequest.ResetPassword request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email không tồn tại"));

        if (user.getResetPasswordCode() == null
                || !user.getResetPasswordCode().equals(request.getCode())) {
            throw new IllegalArgumentException("Mã OTP không đúng");
        }
        if (user.getResetPasswordCodeExpiry() == null
                || LocalDateTime.now().isAfter(user.getResetPasswordCodeExpiry())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetPasswordCode(null);
        user.setResetPasswordCodeExpiry(null);
        userRepository.save(user);

        log.info("Mật khẩu đã được đặt lại cho: {}", user.getEmail());
    }

    @Override
    public AuthResponse refreshToken(AuthRequest.RefreshToken request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtService.isTokenValid(refreshToken)) {
            throw new BadCredentialsException("Refresh token không hợp lệ hoặc đã hết hạn");
        }

        String email = jwtService.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Người dùng không tồn tại"));

        int tokenVersionInToken = jwtService.extractTokenVersion(refreshToken);
        if (tokenVersionInToken != user.getTokenVersion()) {
            throw new BadCredentialsException("SESSION_REPLACED");
        }

        String newAccessToken = jwtService.generateAccessToken(
                user.getEmail(), user.getId().toString(), user.getRole(), user.getTokenVersion());
        String newRefreshToken = jwtService.generateRefreshToken(
                user.getEmail(), user.getId().toString(), user.getTokenVersion());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .online(user.isOnline())
                .build();
    }

    @Override
    @Transactional
    public void logout(String email, String token) {
        if (token != null) {
            try {
                java.util.Date expiration = jwtService.extractExpiration(token);
                tokenBlacklistService.blacklist(token, expiration);
            } catch (Exception e) {
                log.warn("Khong the blacklist token: {}", e.getMessage());
            }
        }
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
            onlineStatusService.setOffline(user.getId());
            log.info("User da dang xuat: {}", email);
        });
    }

    private void sendVerificationCode(User user) {
        String code = generateOtp();
        user.setVerificationCode(code);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        emailService.sendVerificationEmail(user.getEmail(), user.getFirstName(), code);
    }

    private String generateOtp() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtService.generateAccessToken(user.getEmail(), user.getId().toString(), user.getRole(), user.getTokenVersion());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), user.getId().toString(), user.getTokenVersion());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .online(user.isOnline())
                .build();
    }
}
