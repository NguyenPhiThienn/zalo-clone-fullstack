-- ─── 1. User: thêm role và banned ────────────────────────────────────────────
ALTER TABLE user
    ADD COLUMN role   VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN banned TINYINT(1)  NOT NULL DEFAULT 0;

-- ─── 2. Message: soft delete ─────────────────────────────────────────────────
ALTER TABLE message
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0;

-- ─── 3. GroupMessage: soft delete ────────────────────────────────────────────
ALTER TABLE group_message
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0;

-- ─── 4. Reaction cho tin nhắn 1-1 ────────────────────────────────────────────
CREATE TABLE message_reaction (
    id                 CHAR(36)    NOT NULL,
    message_id         CHAR(36)    NOT NULL,
    user_id            CHAR(36)    NOT NULL,
    emoji              VARCHAR(10) NOT NULL,
    created_date       DATETIME    NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_reaction_message FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE,
    CONSTRAINT fk_reaction_user    FOREIGN KEY (user_id)    REFERENCES user(id),
    CONSTRAINT uk_message_reaction UNIQUE (message_id, user_id)
);

CREATE INDEX idx_reaction_message ON message_reaction (message_id);

-- ─── 5. Reaction cho tin nhắn nhóm ───────────────────────────────────────────
CREATE TABLE group_message_reaction (
    id               CHAR(36)    NOT NULL,
    group_message_id CHAR(36)    NOT NULL,
    user_id          CHAR(36)    NOT NULL,
    emoji            VARCHAR(10) NOT NULL,
    created_date     DATETIME    NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_greaction_message FOREIGN KEY (group_message_id) REFERENCES group_message(id) ON DELETE CASCADE,
    CONSTRAINT fk_greaction_user    FOREIGN KEY (user_id)           REFERENCES user(id),
    CONSTRAINT uk_group_msg_reaction UNIQUE (group_message_id, user_id)
);

CREATE INDEX idx_greaction_message ON group_message_reaction (group_message_id);

-- ─── 6. AI Chatbot messages ───────────────────────────────────────────────────
CREATE TABLE ai_message (
    id                 CHAR(36)    NOT NULL,
    user_id            CHAR(36)    NOT NULL,
    role               VARCHAR(20) NOT NULL,
    content            TEXT        NOT NULL,
    created_date       DATETIME    NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_message_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_message_user    ON ai_message (user_id);
CREATE INDEX idx_ai_message_created ON ai_message (created_date);
