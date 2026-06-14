package com.example.backend.controllers;

import com.example.backend.auth.dto.AuthRequest;
import com.example.backend.group.dto.GroupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("GroupController Integration Tests")
class GroupControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private static String adminToken;
    private static String memberToken;
    private static String outsiderToken;
    private static String memberId;
    private static String outsiderId;
    private static String groupId;

    @BeforeAll
    static void setup(@Autowired MockMvc mockMvc,
                      @Autowired ObjectMapper objectMapper) throws Exception {
        // Admin
        MvcResult r1 = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AuthRequest.Register.builder()
                                .email("group_admin@gmail.com").password("123456")
                                .firstName("Group").lastName("Admin").build())))
                .andReturn();
        adminToken = objectMapper.readTree(r1.getResponse().getContentAsString())
                .get("accessToken").asText();

        // Member
        MvcResult r2 = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AuthRequest.Register.builder()
                                .email("group_member@gmail.com").password("123456")
                                .firstName("Group").lastName("Member").build())))
                .andReturn();
        memberToken = objectMapper.readTree(r2.getResponse().getContentAsString())
                .get("accessToken").asText();
        memberId = objectMapper.readTree(r2.getResponse().getContentAsString())
                .get("userId").asText();

        // Outsider
        MvcResult r3 = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(AuthRequest.Register.builder()
                                .email("group_outsider@gmail.com").password("123456")
                                .firstName("Group").lastName("Outsider").build())))
                .andReturn();
        outsiderToken = objectMapper.readTree(r3.getResponse().getContentAsString())
                .get("accessToken").asText();
        outsiderId = objectMapper.readTree(r3.getResponse().getContentAsString())
                .get("userId").asText();
    }

    // ─── Tạo nhóm ─────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("POST /group - tạo nhóm thành công")
    void createGroup_success() throws Exception {
        GroupRequest.Create req = GroupRequest.Create.builder()
                .name("Nhóm Test IT")
                .description("Nhóm integration test")
                .memberIds(List.of(UUID.fromString(memberId)))
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/group")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Nhóm Test IT"))
                .andExpect(jsonPath("$.memberCount").value(2))
                .andExpect(jsonPath("$.isAdmin").value(true))
                .andReturn();

        groupId = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asText();
    }

    @Test @Order(2)
    @DisplayName("POST /group - thiếu name → 400")
    void createGroup_missingName() throws Exception {
        GroupRequest.Create req = GroupRequest.Create.builder()
                .name("")
                .memberIds(List.of(UUID.fromString(memberId)))
                .build();

        mockMvc.perform(post("/api/v1/group")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ─── Lấy nhóm ─────────────────────────────────────────────────────────────

    @Test @Order(3)
    @DisplayName("GET /group - lấy danh sách nhóm")
    void getMyGroups_success() throws Exception {
        mockMvc.perform(get("/api/v1/group")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test @Order(4)
    @DisplayName("GET /group/{id} - lấy chi tiết nhóm")
    void getGroupById_success() throws Exception {
        mockMvc.perform(get("/api/v1/group/" + groupId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(groupId))
                .andExpect(jsonPath("$.name").value("Nhóm Test IT"));
    }

    @Test @Order(5)
    @DisplayName("GET /group/{id} - outsider không có quyền")
    void getGroupById_outsider_fails() throws Exception {
        mockMvc.perform(get("/api/v1/group/" + groupId)
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    // ─── Cập nhật nhóm ────────────────────────────────────────────────────────

    @Test @Order(6)
    @DisplayName("PUT /group/{id} - cập nhật thành công (admin)")
    void updateGroup_success() throws Exception {
        GroupRequest.Update req = GroupRequest.Update.builder()
                .name("Nhóm Test IT Updated")
                .build();

        mockMvc.perform(put("/api/v1/group/" + groupId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nhóm Test IT Updated"));
    }

    @Test @Order(7)
    @DisplayName("PUT /group/{id} - member không phải admin → lỗi")
    void updateGroup_notAdmin_fails() throws Exception {
        GroupRequest.Update req = GroupRequest.Update.builder().name("Hack").build();

        mockMvc.perform(put("/api/v1/group/" + groupId)
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ─── Thêm thành viên ──────────────────────────────────────────────────────

    @Test @Order(8)
    @DisplayName("POST /group/{id}/members - thêm thành viên thành công")
    void addMembers_success() throws Exception {
        GroupRequest.AddMember req = new GroupRequest.AddMember(
                List.of(UUID.fromString(outsiderId)));

        mockMvc.perform(post("/api/v1/group/" + groupId + "/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberCount").value(3));
    }

    // ─── Tin nhắn nhóm ────────────────────────────────────────────────────────

    @Test @Order(9)
    @DisplayName("POST /group/{id}/messages - gửi tin nhắn thành công")
    void sendMessage_success() throws Exception {
        GroupRequest.SendMessage req = GroupRequest.SendMessage.builder()
                .content("Hello nhóm!").build();

        mockMvc.perform(post("/api/v1/group/" + groupId + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Hello nhóm!"))
                .andExpect(jsonPath("$.isMine").value(true));
    }

    @Test @Order(10)
    @DisplayName("GET /group/{id}/messages - lấy tin nhắn nhóm")
    void getMessages_success() throws Exception {
        mockMvc.perform(get("/api/v1/group/" + groupId + "/messages?page=0&size=10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    // ─── Rời nhóm / Xóa thành viên ───────────────────────────────────────────

    @Test @Order(11)
    @DisplayName("DELETE /group/{id}/members/{userId} - xóa thành viên")
    void removeMember_success() throws Exception {
        mockMvc.perform(delete("/api/v1/group/" + groupId + "/members/" + outsiderId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test @Order(12)
    @DisplayName("DELETE /group/{id}/leave - member rời nhóm")
    void leaveGroup_success() throws Exception {
        mockMvc.perform(delete("/api/v1/group/" + groupId + "/leave")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk());
    }
}