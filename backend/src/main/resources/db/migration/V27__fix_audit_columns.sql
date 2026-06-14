-- Fix audit columns for audit_log table
ALTER TABLE audit_log CHANGE COLUMN created_at created_date DATETIME NOT NULL;
ALTER TABLE audit_log ADD COLUMN last_modified_date DATETIME;

-- Fix audit columns for reports table
ALTER TABLE reports CHANGE COLUMN created_at created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reports ADD COLUMN last_modified_date DATETIME;

-- Fix missing audit columns for pinned_group_message table
ALTER TABLE pinned_group_message ADD COLUMN last_modified_date DATETIME;
