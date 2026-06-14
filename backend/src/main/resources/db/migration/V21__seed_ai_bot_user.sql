-- Seed AI Bot user (system account, không đăng nhập được)
-- UUID cố định: 00000000-0000-0000-0000-000000000001
-- Tương ứng với GroupAiService.AI_BOT_USER_ID

INSERT IGNORE INTO `user` (
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
    '',   -- không có password hợp lệ → không thể đăng nhập
    0,
    'USER',
    0,
    1,
    1,
    NOW(),
    NOW()
);
