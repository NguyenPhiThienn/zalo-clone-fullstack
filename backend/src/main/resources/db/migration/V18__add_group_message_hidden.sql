CREATE TABLE group_message_hidden (
    message_id CHAR(36) NOT NULL,
    user_id    CHAR(36) NOT NULL,
    PRIMARY KEY (message_id, user_id),
    CONSTRAINT fk_gmh_message FOREIGN KEY (message_id) REFERENCES group_message(id) ON DELETE CASCADE,
    CONSTRAINT fk_gmh_user    FOREIGN KEY (user_id)    REFERENCES user(id) ON DELETE CASCADE
);
