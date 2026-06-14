CREATE TABLE IF NOT EXISTS group_join_request (
    id                  CHAR(36)     NOT NULL PRIMARY KEY,
    group_id            CHAR(36)     NOT NULL,
    requested_by_id     CHAR(36)     NOT NULL,
    target_user_id      CHAR(36)     NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_date        DATETIME(6),
    last_modified_date  DATETIME(6),
    CONSTRAINT fk_gjr_group     FOREIGN KEY (group_id)        REFERENCES `group`(id) ON DELETE CASCADE,
    CONSTRAINT fk_gjr_requester FOREIGN KEY (requested_by_id) REFERENCES user(id)    ON DELETE CASCADE,
    CONSTRAINT fk_gjr_target    FOREIGN KEY (target_user_id)  REFERENCES user(id)    ON DELETE CASCADE
);
