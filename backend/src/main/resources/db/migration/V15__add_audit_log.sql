CREATE TABLE audit_log (
    id CHAR(36) NOT NULL PRIMARY KEY,
    admin_id CHAR(36) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id CHAR(36),
    target_name VARCHAR(255),
    details TEXT,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_audit_log_admin FOREIGN KEY (admin_id) REFERENCES `user`(id)
);
