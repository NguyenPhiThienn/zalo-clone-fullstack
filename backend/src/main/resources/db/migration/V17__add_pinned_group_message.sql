CREATE TABLE pinned_group_message (
    id           CHAR(36)     NOT NULL,
    group_id     CHAR(36)     NOT NULL,
    message_id   CHAR(36)     NOT NULL,
    pinned_by    CHAR(36)     NOT NULL,
    created_date DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_pinned_group_message (group_id, message_id),
    KEY idx_pinned_group (group_id),
    CONSTRAINT fk_pinned_group FOREIGN KEY (group_id)   REFERENCES `group`(id) ON DELETE CASCADE,
    CONSTRAINT fk_pinned_msg   FOREIGN KEY (message_id) REFERENCES group_message(id) ON DELETE CASCADE,
    CONSTRAINT fk_pinned_by    FOREIGN KEY (pinned_by)  REFERENCES user(id)
);
