-- V3__create_group_tables.sql
-- Tạo bảng nhóm chat

CREATE TABLE `group` (
                         id          CHAR(36)     NOT NULL PRIMARY KEY,
                         name        VARCHAR(100) NOT NULL,
                         description TEXT,
                         avatar_url  VARCHAR(500),
                         created_by  CHAR(36)     NOT NULL,
                         created_date DATETIME(6),
                         last_modified_date DATETIME(6),
                         created_by_user VARCHAR(255),
                         last_modified_by_user VARCHAR(255),

                         CONSTRAINT fk_group_created_by FOREIGN KEY (created_by) REFERENCES user(id),
                         INDEX idx_group_created_by (created_by)
);

CREATE TABLE group_member (
                              id          CHAR(36) NOT NULL PRIMARY KEY,
                              group_id    CHAR(36) NOT NULL,
                              user_id     CHAR(36) NOT NULL,
                              admin       TINYINT(1) NOT NULL DEFAULT 0,
                              created_date DATETIME(6),
                              last_modified_date DATETIME(6),
                              created_by_user VARCHAR(255),
                              last_modified_by_user VARCHAR(255),

                              CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES `group`(id) ON DELETE CASCADE,
                              CONSTRAINT fk_group_member_user  FOREIGN KEY (user_id)  REFERENCES user(id),
                              CONSTRAINT uk_group_member UNIQUE (group_id, user_id),
                              INDEX idx_group_member_group (group_id),
                              INDEX idx_group_member_user  (user_id)
);

CREATE TABLE group_message (
                               id          CHAR(36)    NOT NULL PRIMARY KEY,
                               content     TEXT,
                               type        VARCHAR(50) NOT NULL DEFAULT 'TEXT',
                               group_id    CHAR(36)    NOT NULL,
                               sender_id   CHAR(36)    NOT NULL,
                               created_date DATETIME(6),
                               last_modified_date DATETIME(6),
                               created_by_user VARCHAR(255),
                               last_modified_by_user VARCHAR(255),

                               CONSTRAINT fk_group_message_group  FOREIGN KEY (group_id)  REFERENCES `group`(id) ON DELETE CASCADE,
                               CONSTRAINT fk_group_message_sender FOREIGN KEY (sender_id) REFERENCES user(id),
                               INDEX idx_group_message_group   (group_id),
                               INDEX idx_group_message_sender  (sender_id),
                               INDEX idx_group_message_created (created_date)
);