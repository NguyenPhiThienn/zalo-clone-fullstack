import api from './axios';

/**
 * Upload một file bằng chứng trước khi gửi report.
 * Trả về { key, url } — lưu `key` để đính kèm vào evidenceKeys khi submit.
 */
export const uploadReportEvidence = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/v1/report/evidence', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** Submit báo cáo tố cáo user */
export const createReport = (userId, data) =>
  api.post(`/api/v1/report/${userId}`, data);

/** Admin: lấy danh sách báo cáo, lọc theo status */
export const getReports = (status, page = 0, size = 20) =>
  api.get('/api/v1/admin/reports', { params: { status, page, size } });

/** Admin: xử lý báo cáo (resolve / dismiss + optional ban) */
export const resolveReport = (id, data) =>
  api.patch(`/api/v1/admin/reports/${id}/resolve`, data);
