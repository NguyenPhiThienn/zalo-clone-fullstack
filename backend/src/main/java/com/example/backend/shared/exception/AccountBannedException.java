package com.example.backend.shared.exception;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class AccountBannedException extends RuntimeException {
    private final String banReason;
    private final LocalDateTime banUntil;
    private final LocalDateTime bannedAt;

    public AccountBannedException(String banReason, LocalDateTime banUntil, LocalDateTime bannedAt) {
        super("ACCOUNT_BANNED");
        this.banReason = banReason;
        this.banUntil = banUntil;
        this.bannedAt = bannedAt;
    }
}
