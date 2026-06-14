CREATE TABLE blocked_users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    blocker_id CHAR(36) NOT NULL,
    blocked_id CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uq_blocker_blocked (blocker_id, blocked_id),
    CONSTRAINT fk_blocked_users_blocker FOREIGN KEY (blocker_id) REFERENCES `user`(id),
    CONSTRAINT fk_blocked_users_blocked FOREIGN KEY (blocked_id) REFERENCES `user`(id)
);
