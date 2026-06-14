package com.example.backend.shared.config;

import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.group.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Profile("!test")
public class DataSeeder implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;
    private final GroupRepository groupRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        // Luôn upsert admin account mỗi lần start (đảm bảo admin luôn tồn tại và login được)
        seedDefaultAdmin();
        // Luôn upsert AI Bot user mỗi lần start
        seedAiBot();

        if (userRepository.count() > 1) {
            log.info("Data đã tồn tại — bỏ qua CSV seeding");
            return;
        }

        log.info("Bắt đầu seeding dữ liệu ban đầu...");

        // Import CSV nếu có
        importCsvIfExists("csvdata/user.csv",
                "INSERT INTO user (id,first_name,last_name,email,password,is_online,last_seen,keycloak_id,created_date,last_modified_date) " +
                        "VALUES (?,?,?,?,?,?,?,?,?,?)");

        importCsvIfExists("csvdata/chat.csv",
                "INSERT INTO chat (id,user1_id,user2_id,created_date,last_modified_date) " +
                        "VALUES (?,?,?,?,?)");

        importCsvIfExists("csvdata/message.csv",
                "INSERT INTO message (id,content,state,type,chat_id,sender_id,created_date,last_modified_date) " +
                        "VALUES (?,?,?,?,?,?,?,?)");

        importCsvIfExists("csvdata/group.csv",
                "INSERT INTO `group` (id,name,description,avatar_url,created_by,created_date,last_modified_date) " +
                        "VALUES (?,?,?,?,?,?,?)");

        importCsvIfExists("csvdata/group_member.csv",
                "INSERT INTO group_member (id,group_id,user_id,admin,created_date,last_modified_date) " +
                        "VALUES (?,?,?,?,?,?)");

        importCsvIfExists("csvdata/group_message.csv",
                "INSERT INTO group_message (id,content,type,group_id,sender_id,created_date,last_modified_date) " +
                        "VALUES (?,?,?,?,?,?,?)");

        log.info("✅ Seeding hoàn tất!");
        log.info("  Users:  {}", userRepository.count());
        log.info("  Chats:  {}", chatRepository.count());
        log.info("  Groups: {}", groupRepository.count());
    }

    private void seedAiBot() {
        String botId = "00000000-0000-0000-0000-000000000001";
        boolean exists = userRepository.findById(java.util.UUID.fromString(botId)).isPresent();
        if (!exists) {
            jdbc.update(
                "INSERT INTO `user` " +
                "(id, first_name, last_name, email, password, is_online, role, banned, email_verified, token_version, created_date, last_modified_date) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
                botId, "Trợ lý", "AI", "ai-bot@system.local", "", 0, "USER", 0, 1, 1
            );
            log.info("  ✓ AI Bot user đã được tạo: {}", botId);
        } else {
            log.info("  ✓ AI Bot user đã tồn tại: {}", botId);
        }
    }

    private void seedDefaultAdmin() {
        User admin = userRepository.findByEmail("admin@zalo.com").orElse(new User());
        admin.setEmail("admin@zalo.com");
        admin.setPassword(passwordEncoder.encode("Admin@1234"));
        admin.setFirstName("Admin");
        admin.setLastName("System");
        admin.setRole("ADMIN");
        admin.setBanned(false);
        admin.setOnline(false);
        admin.setEmailVerified(true);
        admin.setLastSeen(LocalDateTime.now());
        userRepository.save(admin);
        log.info("  ✓ Admin upsert thành công: admin@zalo.com / Admin@1234");
    }

    // ─── Helper: đọc CSV và batch insert ─────────────────────────────────────

    private void importCsvIfExists(String resourcePath, String sql) throws Exception {
        ClassPathResource resource = new ClassPathResource(resourcePath);

        if (!resource.exists()) {
            log.warn("Không tìm thấy file: {}", resourcePath);
            return;
        }

        List<Object[]> rows = new ArrayList<>();

        // Số cột dựa theo số dấu ? trong SQL
        int columnCount = (int) sql.chars().filter(c -> c == '?').count();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine(); // bỏ qua header
            if (headerLine == null) return;

            String line;

            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                Object[] values = parseCsvLine(line, columnCount);
                rows.add(values);
            }
        }

        // Batch insert
        jdbc.batchUpdate(sql, rows);
        log.info("  ✓ {} — {} dòng", resourcePath, rows.size());
    }

    // ─── Parse CSV line, xử lý NULL và quoted strings ────────────────────────

    private Object[] parseCsvLine(String line, int expectedColumns) {
        List<Object> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(parseValue(current.toString()));
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        values.add(parseValue(current.toString()));

        // Padding nếu thiếu cột, truncate nếu thừa
        while (values.size() < expectedColumns) {
            values.add(null);
        }

        return values.subList(0, expectedColumns).toArray();
    }

    private Object parseValue(String raw) {
        String trimmed = raw.trim();
        // "None" hoặc rỗng → NULL
        if (trimmed.isEmpty() || trimmed.equalsIgnoreCase("none")
                || trimmed.equalsIgnoreCase("null")) {
            return null;
        }
        return trimmed;
    }
}