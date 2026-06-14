package com.example.backend.shared.config;

import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createTestUser("admin@gmail.com", "Admin", "User");
        createTestUser("test@gmail.com", "Test", "User");
    }

    private void createTestUser(String email, String firstName, String lastName) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode("123456"));
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setEmailVerified(true);
            user.setTokenVersion(1);
            user.setOnline(false);
            
            userRepository.save(user);
            log.info("Created mock user: {}", email);
        } else {
            log.info("Mock user already exists: {}", email);
        }
    }
}
