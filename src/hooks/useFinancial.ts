import { useQuery } from "@tanstack/react-query";
import { financeiroApi, type Pagamento, type FinanceiroSummary } from "@/lib/api";

export function useFinancialList(params?: { month?: string; status?: string; startDate?: string; endDate?: string }) {
  return useQuery<Pagamento[]>({
    queryKey: ["financial", "list", params],
    queryFn: () => financeiroApi.list(params),
    staleTime: 30_000,
  });
}

export function useFinancialSummary(month?: string) {
  return useQuery<FinanceiroSummary>({
    queryKey: ["financial", "summary", month],
    queryFn: () => financeiroApi.summary(month),
    staleTime: 30_000,
  });
}
