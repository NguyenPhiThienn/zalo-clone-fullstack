-- Rollback changes from V27 to match original schema
ALTER TABLE audit_log CHANGE COLUMN created_date created_at DATETIME NOT NULL;
ALTER TABLE audit_log DROP COLUMN last_modified_date;

ALTER TABLE reports CHANGE COLUMN created_date created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reports DROP COLUMN last_modified_date;

ALTER TABLE pinned_group_message DROP COLUMN last_modified_date;
