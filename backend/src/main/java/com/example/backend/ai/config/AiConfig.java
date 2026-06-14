package com.example.backend.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder, @Value("${app.ai.system-prompt}") String systemPrompt) {
        return builder.defaultSystem(systemPrompt).build();
    }
}
