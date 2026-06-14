ALTER TABLE `user` ADD COLUMN ban_reason VARCHAR(500) NULL;
ALTER TABLE `user` ADD COLUMN ban_until DATETIME NULL;
ALTER TABLE `user` ADD COLUMN banned_at DATETIME NULL;

CREATE TABLE reports (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  reporter_id CHAR(36) NOT NULL,
  reported_id CHAR(36) NOT NULL,
  reason      VARCHAR(100) NOT NULL,
  description VARCHAR(1000) NULL,
  status      ENUM('PENDING','RESOLVED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  resolved_by CHAR(36) NULL,
  resolution  VARCHAR(500) NULL,
  CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES `user`(id),
  CONSTRAINT fk_report_reported FOREIGN KEY (reported_id) REFERENCES `user`(id),
  CONSTRAINT fk_report_resolver FOREIGN KEY (resolved_by) REFERENCES `user`(id)
);
