package com.example.backend.services;

import com.example.backend.ai.service.ChatAiService;
import com.example.backend.chat.entity.Chat;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.UUID;

@SpringBootTest
@ActiveProfiles("test")
public class AiMentionTest {
    @Autowired private ChatAiService chatAiService;
    @Autowired private ChatRepository chatRepository;
    @Autowired private UserRepository userRepository;
    
    @Test
    public void testMention() throws Exception {
        System.out.println("--- Starting AI Mention test ---");
        try {
            User u1 = userRepository.save(User.builder().id(UUID.randomUUID()).email("u1@x.com").firstName("User").lastName("One").build());
            User u2 = userRepository.save(User.builder().id(UUID.randomUUID()).email("u2@x.com").firstName("User").lastName("Two").build());
            Chat chat = chatRepository.save(Chat.builder().id(UUID.randomUUID()).user1(u1).user2(u2).build());
            
            chatAiService.handleBotMentionAsync(chat.getId(), "Hello @ai", "Test Sender");
            Thread.sleep(5000);
        } catch (Exception e) {
            e.printStackTrace();
        }
        System.out.println("--- AI Mention test complete ---");
    }
}
