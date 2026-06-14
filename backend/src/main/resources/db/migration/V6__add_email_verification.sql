-- Email verification & password reset fields
ALTER TABLE `user`
    ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN `verification_code` VARCHAR(6) NULL,
    ADD COLUMN `verification_code_expiry` DATETIME NULL,
    ADD COLUMN `reset_password_code` VARCHAR(6) NULL,
    ADD COLUMN `reset_password_code_expiry` DATETIME NULL;

-- Mark existing users as already verified (they registered before this feature)
UPDATE `user` SET `email_verified` = 1;
