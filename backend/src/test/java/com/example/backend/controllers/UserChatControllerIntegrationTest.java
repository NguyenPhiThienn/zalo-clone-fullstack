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
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("UserController + ChatController Integration Tests")
class UserChatControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;

    @MockBean EmailService emailService;

    private static String tokenUser1;
    private static String tokenUser2;
    private static String user2Id;
    private static String chatId;

    @BeforeEach
    void mockEmail() {
        doNothing().when(emailService).sendVerificationEmail(any(), any(), any());
    }

    // ─── Helper: register + verify → token ───────────────────────────────────

    private String registerAndVerify(String email, String password) throws Exception {
        // Skip if already registered
        if (userRepository.findByEmail(email).isPresent()) {
            AuthRequest.Login loginReq = AuthRequest.Login.builder()
                    .email(email).password(password).build();
            MvcResult r = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginReq)))
                    .andReturn();
            String body = r.getResponse().getContentAsString();
            if (!body.isEmpty() && objectMapper.readTree(body).has("accessToken")) {
                return objectMapper.readTree(body).get("accessToken").asText();
            }
        }

        // Register
        AuthRequest.Register req = AuthRequest.Register.builder()
                .email(email).password(password)
                .firstName("Chat").lastName("User").build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)));

        // Verify
        User user = userRepository.findByEmail(email).orElseThrow();
        String otp = user.getVerificationCode();
        AuthRequest.VerifyEmail verifyReq = new AuthRequest.VerifyEmail(email, otp);
        MvcResult verifyResult = mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andReturn();

        String body = verifyResult.getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    @BeforeAll
    static void setup(@Autowired MockMvc mockMvc,
                      @Autowired ObjectMapper objectMapper,
                      @Autowired UserRepository userRepository,
                      @Autowired EmailService emailService) throws Exception {
        // EmailService is MockBean; doNothing already set in BeforeEach but need it here too
        doNothing().when(emailService).sendVerificationEmail(any(), any(), any());

        // Create user1
        setupUser(mockMvc, objectMapper, userRepository, "chat_user1@gmail.com", "123456");
        // Create user2
        setupUser(mockMvc, objectMapper, userRepository, "chat_user2@gmail.com", "123456");

        // Store user2 id
        User u2 = userRepository.findByEmail("chat_user2@gmail.com").orElseThrow();
        user2Id = u2.getId().toString();
    }

    private static void setupUser(MockMvc mockMvc, ObjectMapper objectMapper,
                                   UserRepository userRepository,
                                   String email, String password) throws Exception {
        if (userRepository.findByEmail(email).isPresent()) {
            User existing = userRepository.findByEmail(email).orElseThrow();
            if (existing.isEmailVerified()) return;
        }

        AuthRequest.Register req = AuthRequest.Register.builder()
                .email(email).password(password)
                .firstName("Chat").lastName("User").build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)));

        User user = userRepository.findByEmail(email).orElseThrow();
        if (!user.isEmailVerified()) {
            String otp = user.getVerificationCode();
            AuthRequest.VerifyEmail verifyReq = new AuthRequest.VerifyEmail(email, otp);
            mockMvc.perform(post("/api/v1/auth/verify-email")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(verifyReq)));
        }
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        AuthRequest.Login req = AuthRequest.Login.builder()
                .email(email).password(password).build();
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn();
        String body = result.getResponse().getContentAsString();
        if (body.isEmpty()) return null;
        var tree = objectMapper.readTree(body);
        return tree.has("accessToken") ? tree.get("accessToken").asText() : null;
    }

    // ─── User API ─────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("GET /user - lấy danh sách user thành công")
    void getUsers_success() throws Exception {
        tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");
        Assumptions.assumeTrue(tokenUser1 != null, "Không lấy được token user1");

        mockMvc.perform(get("/api/v1/user")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test @Order(2)
    @DisplayName("GET /user - không có token → 401")
    void getUsers_noToken() throws Exception {
        mockMvc.perform(get("/api/v1/user"))
                .andExpect(status().isUnauthorized());
    }

    @Test @Order(3)
    @DisplayName("GET /user/me - lấy profile bản thân")
    void getMyProfile_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/user/me")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("chat_user1@gmail.com"));
    }

    @Test @Order(4)
    @DisplayName("GET /user/search - tìm kiếm user")
    void searchUsers_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/user/search?keyword=Chat")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test @Order(5)
    @DisplayName("GET /user/search - không có kết quả")
    void searchUsers_noResult() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/user/search?keyword=xyzxyzxyz999")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── Chat API ─────────────────────────────────────────────────────────────

    @Test @Order(6)
    @DisplayName("POST /chat/start - tạo chat thành công")
    void startChat_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        MvcResult result = mockMvc.perform(post("/api/v1/chat/start/" + user2Id)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();

        chatId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test @Order(7)
    @DisplayName("POST /chat/start - gọi lại → trả về chat cũ")
    void startChat_returnsExisting() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");
        Assumptions.assumeTrue(chatId != null, "chatId chưa được tạo");

        mockMvc.perform(post("/api/v1/chat/start/" + user2Id)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(chatId));
    }

    @Test @Order(8)
    @DisplayName("GET /chat - lấy danh sách chat")
    void getChats_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/chat")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(greaterThan(0)));
    }

    @Test @Order(9)
    @DisplayName("GET /chat/{chatId} - lấy chi tiết chat")
    void getChatById_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");
        Assumptions.assumeTrue(chatId != null, "chatId chưa được tạo");

        mockMvc.perform(get("/api/v1/chat/" + chatId)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(chatId));
    }

    @Test @Order(10)
    @DisplayName("GET /message/chat/{chatId} - lấy tin nhắn trong chat")
    void getChatMessages_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");
        Assumptions.assumeTrue(chatId != null, "chatId chưa được tạo");

        mockMvc.perform(get("/api/v1/message/chat/" + chatId)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test @Order(11)
    @DisplayName("PATCH /message/seen/{chatId} - đánh dấu đã đọc")
    void markAsRead_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");
        Assumptions.assumeTrue(chatId != null, "chatId chưa được tạo");

        mockMvc.perform(patch("/api/v1/message/seen/" + chatId)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk());
    }

    @Test @Order(12)
    @DisplayName("GET /chat/{chatId} - user khác không có quyền → 403")
    void getChatById_wrongUser_fails() throws Exception {
        Assumptions.assumeTrue(chatId != null, "chatId chưa được tạo");

        // User3 không liên quan đến chat này
        String email3 = "chat_user3_intg@gmail.com";
        setupUser(mockMvc, objectMapper, userRepository, email3, "123456");
        String token3 = loginAndGetToken(email3, "123456");

        mockMvc.perform(get("/api/v1/chat/" + chatId)
                        .header("Authorization", "Bearer " + token3))
                .andExpect(status().isForbidden());
    }

    @Test @Order(13)
    @DisplayName("DELETE /chat/{chatId} - xóa chat thành công (soft delete)")
    void deleteChat_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");
        Assumptions.assumeTrue(chatId != null, "chatId chưa được tạo");

        mockMvc.perform(delete("/api/v1/chat/" + chatId)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk());
    }

    // ─── FriendRequest API ────────────────────────────────────────────────────

    @Test @Order(14)
    @DisplayName("POST /friend-request/send/{receiverId} - gửi lời mời kết bạn")
    void sendFriendRequest_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        mockMvc.perform(post("/api/v1/friend-request/send/" + user2Id)
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk());
    }

    @Test @Order(15)
    @DisplayName("GET /friend-request/sent - lấy danh sách đã gửi")
    void getSentFriendRequests_success() throws Exception {
        if (tokenUser1 == null) tokenUser1 = loginAndGetToken("chat_user1@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/friend-request/sent")
                        .header("Authorization", "Bearer " + tokenUser1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test @Order(16)
    @DisplayName("GET /friend-request/pending - user2 xem requests đến")
    void getPendingFriendRequests_success() throws Exception {
        if (tokenUser2 == null) tokenUser2 = loginAndGetToken("chat_user2@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/friend-request/pending")
                        .header("Authorization", "Bearer " + tokenUser2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test @Order(17)
    @DisplayName("GET /user/me - profile user2")
    void getMyProfile_user2() throws Exception {
        if (tokenUser2 == null) tokenUser2 = loginAndGetToken("chat_user2@gmail.com", "123456");

        mockMvc.perform(get("/api/v1/user/me")
                        .header("Authorization", "Bearer " + tokenUser2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("chat_user2@gmail.com"));
    }
}
