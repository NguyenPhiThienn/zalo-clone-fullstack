import { useMutation } from "@tanstack/react-query";
import { createReport, ReportRequest } from "@/api/report";

export const useCreateReport = () => {
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: ReportRequest }) => 
      createReport(userId, payload),
  });
};
