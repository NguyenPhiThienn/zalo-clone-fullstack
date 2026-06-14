
CREATE TABLE user
(
    id                 CHAR(36)     NOT NULL,
    first_name         VARCHAR(100) NOT NULL,
    last_name          VARCHAR(100) NOT NULL,
    email              VARCHAR(255) NOT NULL UNIQUE,
    last_seen          DATETIME,

    keycloak_id        VARCHAR(255) UNIQUE,

    is_online          TINYINT(1)   NOT NULL DEFAULT 0,

    created_date       DATETIME     NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id)
);

CREATE INDEX idx_user_email       ON user (email);
CREATE INDEX idx_user_keycloak_id ON user (keycloak_id);

CREATE TABLE chat
(
    id                 CHAR(36) NOT NULL,
    user1_id           CHAR(36) NOT NULL,
    user2_id           CHAR(36) NOT NULL,
    created_date       DATETIME NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_chat_user1 FOREIGN KEY (user1_id) REFERENCES user (id),
    CONSTRAINT fk_chat_user2 FOREIGN KEY (user2_id) REFERENCES user (id)
);

CREATE INDEX idx_chat_user1_id ON chat (user1_id);
CREATE INDEX idx_chat_user2_id ON chat (user2_id);
CREATE TABLE message
(
    id                 CHAR(36) NOT NULL,
    content            TEXT,
    state              ENUM ('SENT', 'DELIVERED', 'RECEIVED', 'SEEN') NOT NULL DEFAULT 'SENT',
    type               ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE') NOT NULL DEFAULT 'TEXT',

    chat_id            CHAR(36) NOT NULL,
    sender_id          CHAR(36) NOT NULL,
    created_date       DATETIME NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_message_chat   FOREIGN KEY (chat_id)   REFERENCES chat (id),
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES user (id)
);

CREATE INDEX idx_message_chat_id   ON message (chat_id);
CREATE INDEX idx_message_sender_id ON message (sender_id);
CREATE INDEX idx_message_state     ON message (state);