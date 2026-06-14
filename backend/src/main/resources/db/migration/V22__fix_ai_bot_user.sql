-- Fix: đảm bảo AI Bot user tồn tại trong DB
-- V21 đã chạy nhưng INSERT IGNORE bị bỏ qua âm thầm
-- Dùng ON DUPLICATE KEY UPDATE để idempotent (chạy nhiều lần vẫn an toàn)

INSERT INTO `user` (
    id,
    first_name,
    last_name,
    email,
    password,
    is_online,
    role,
    banned,
    email_verified,
    token_version,
    created_date,
    last_modified_date
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Trợ lý',
    'AI',
    'ai-bot@system.local',
    '',
    0,
    'USER',
    0,
    1,
    1,
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    first_name         = VALUES(first_name),
    last_name          = VALUES(last_name);
