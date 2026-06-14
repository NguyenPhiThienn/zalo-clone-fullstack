import { fetchAPI } from "@/lib/fetch";

export interface ReportRequest {
  reason: string;
  description?: string;
  type: "USER" | "MESSAGE" | "GROUP";
  targetId: string;
}

export interface ReportDto {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  description: string;
  status: "PENDING" | "RESOLVED" | "REJECTED";
  createdDate: string;
}

export const createReport = async (userId: string, payload: ReportRequest): Promise<ReportDto> => {
  return fetchAPI(`/report/${userId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
