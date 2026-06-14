CREATE TABLE friend_request
(
    id                 CHAR(36)     NOT NULL,
    sender_id          CHAR(36)     NOT NULL,
    receiver_id        CHAR(36)     NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_date       DATETIME     NOT NULL,
    last_modified_date DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_friend_request_sender   FOREIGN KEY (sender_id)   REFERENCES user (id) ON DELETE CASCADE,
    CONSTRAINT fk_friend_request_receiver FOREIGN KEY (receiver_id) REFERENCES user (id) ON DELETE CASCADE,
    CONSTRAINT unique_friend_request      UNIQUE (sender_id, receiver_id)
);
