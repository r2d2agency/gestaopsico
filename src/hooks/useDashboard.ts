import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type DashboardSummary } from "@/lib/api";

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
    staleTime: 30_000,
  });
}
