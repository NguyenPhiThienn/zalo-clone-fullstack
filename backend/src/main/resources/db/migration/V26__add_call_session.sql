-- V26: Call session history table for 1-1 voice/video calls
CREATE TABLE call_session (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    chat_id      CHAR(36)     NOT NULL,
    initiator_id CHAR(36)     NOT NULL,
    receiver_id  CHAR(36)     NOT NULL,
    call_type    VARCHAR(10)  NOT NULL COMMENT 'VOICE | VIDEO',
    status       VARCHAR(20)  NOT NULL COMMENT 'MISSED | ENDED | REJECTED',
    duration_sec INT          NULL,
    started_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ended_at     DATETIME(6)  NULL,
    created_date      DATETIME(6)  NULL,
    last_modified_date DATETIME(6) NULL,

    CONSTRAINT fk_call_chat      FOREIGN KEY (chat_id)      REFERENCES chat(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_initiator FOREIGN KEY (initiator_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_receiver  FOREIGN KEY (receiver_id)  REFERENCES user(id) ON DELETE CASCADE,

    INDEX idx_call_chat_id    (chat_id),
    INDEX idx_call_initiator  (initiator_id),
    INDEX idx_call_receiver   (receiver_id),
    INDEX idx_call_started_at (started_at)
);
