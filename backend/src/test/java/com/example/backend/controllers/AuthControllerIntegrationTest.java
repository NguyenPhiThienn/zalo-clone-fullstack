package com.example.backend.controllers;

import com.example.backend.auth.dto.AuthRequest;
import com.example.backend.auth.service.EmailService;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("AuthController Integration Tests")
class AuthControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;

    @MockBean EmailService emailService;

    private static final String TEST_EMAIL    = "itest_auth@gmail.com";
    private static final String TEST_PASSWORD = "123456";

    private static String accessToken;
    private static String refreshToken;

    @BeforeEach
    void mockEmail() {
        doNothing().when(emailService).sendVerificationEmail(any(), any(), any());
        doNothing().when(emailService).sendResetPasswordEmail(any(), any(), any());
    }

    // ─── Helper: đăng ký và xác thực email ────────────────────────────────────

    private String[] registerAndVerify(String email, String password) throws Exception {
        // Register
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email(email).password(password)
                .firstName("ITest").lastName("User").build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Lấy OTP từ DB
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after register"));
        String otp = user.getVerificationCode();

        // Verify email → nhận token
        AuthRequest.VerifyEmail verifyReq = new AuthRequest.VerifyEmail(email, otp);
        MvcResult verifyResult = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn();

        String body = verifyResult.getResponse().getContentAsString();
        String access  = objectMapper.readTree(body).get("accessToken").asText();
        String refresh = objectMapper.readTree(body).get("refreshToken").asText();
        return new String[]{access, refresh};
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("POST /register - thành công → 201")
    void register_success() throws Exception {
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email(TEST_EMAIL).password(TEST_PASSWORD)
                .firstName("ITest").lastName("User").build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test @Order(2)
    @DisplayName("POST /verify-email - OTP đúng → nhận token")
    void verifyEmail_success() throws Exception {
        // Lấy OTP từ DB
        User user = userRepository.findByEmail(TEST_EMAIL)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String otp = user.getVerificationCode();

        AuthRequest.VerifyEmail verifyReq = new AuthRequest.VerifyEmail(TEST_EMAIL, otp);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        accessToken  = objectMapper.readTree(body).get("accessToken").asText();
        refreshToken = objectMapper.readTree(body).get("refreshToken").asText();
    }

    @Test @Order(3)
    @DisplayName("POST /verify-email - OTP sai → 400")
    void verifyEmail_wrongOtp() throws Exception {
        // Tạo user mới chưa verify
        String newEmail = "itest_wrongotp@gmail.com";
        if (userRepository.findByEmail(newEmail).isEmpty()) {
            AuthRequest.Register reg = AuthRequest.Register.builder()
                    .email(newEmail).password("123456")
                    .firstName("Test").lastName("User").build();
            mockMvc.perform(post("/api/v1/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(reg)));
        }

        AuthRequest.VerifyEmail req = new AuthRequest.VerifyEmail(newEmail, "000000");
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test @Order(4)
    @DisplayName("POST /register - email đã tồn tại (đã verify) → 409")
    void register_duplicate_email() throws Exception {
        // TEST_EMAIL đã verify ở order 2
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email(TEST_EMAIL).password(TEST_PASSWORD)
                .firstName("ITest").lastName("User").build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test @Order(5)
    @DisplayName("POST /register - thiếu email → 400")
    void register_missingEmail() throws Exception {
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email("").password(TEST_PASSWORD)
                .firstName("ITest").lastName("User").build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    @Test @Order(6)
    @DisplayName("POST /login - thành công")
    void login_success() throws Exception {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email(TEST_EMAIL).password(TEST_PASSWORD).build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        accessToken  = objectMapper.readTree(body).get("accessToken").asText();
        refreshToken = objectMapper.readTree(body).get("refreshToken").asText();
    }

    @Test @Order(7)
    @DisplayName("POST /login - sai mật khẩu → 401")
    void login_wrongPassword() throws Exception {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email(TEST_EMAIL).password("wrongpass").build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test @Order(8)
    @DisplayName("POST /login - email không tồn tại → 401")
    void login_unknownEmail() throws Exception {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email("nobody@gmail.com").password("123456").build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    @Test @Order(9)
    @DisplayName("POST /refresh - token hợp lệ → 200")
    void refresh_success() throws Exception {
        Assumptions.assumeTrue(refreshToken != null, "refreshToken chưa được set từ test trước");

        AuthRequest.RefreshToken req = new AuthRequest.RefreshToken(refreshToken);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test @Order(10)
    @DisplayName("POST /refresh - token rác → 401")
    void refresh_invalidToken() throws Exception {
        AuthRequest.RefreshToken req = new AuthRequest.RefreshToken("invalid.token.here");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @Test @Order(11)
    @DisplayName("POST /logout - thành công")
    void logout_success() throws Exception {
        Assumptions.assumeTrue(accessToken != null, "accessToken chưa được set");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    @Test @Order(12)
    @DisplayName("POST /logout - không có token → 401")
    void logout_noToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    // ─── Forgot/Reset Password ─────────────────────────────────────────────────

    @Test @Order(13)
    @DisplayName("POST /forgot-password - email tồn tại → 200")
    void forgotPassword_success() throws Exception {
        AuthRequest.ForgotPassword req = new AuthRequest.ForgotPassword(TEST_EMAIL);

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test @Order(14)
    @DisplayName("POST /reset-password - OTP đúng → 200")
    void resetPassword_success() throws Exception {
        // Lấy reset code từ DB
        User user = userRepository.findByEmail(TEST_EMAIL)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String code = user.getResetPasswordCode();

        Assumptions.assumeTrue(code != null, "Reset code chưa được tạo");

        AuthRequest.ResetPassword req = AuthRequest.ResetPassword.builder()
                .email(TEST_EMAIL)
                .code(code)
                .newPassword("NewPass@456")
                .build();

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }
}
