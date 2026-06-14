-- Thêm cột lưu danh sách key S3 của file bằng chứng (JSON array dưới dạng TEXT)
ALTER TABLE reports ADD COLUMN evidence_keys TEXT NULL;
