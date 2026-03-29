import { useQuery } from "@tanstack/react-query";
import { pacientesApi, type Patient } from "@/lib/api";

export function usePatients(search?: string) {
  return useQuery<Patient[]>({
    queryKey: ["patients", search],
    queryFn: async () => {
      const res = await pacientesApi.list(search ? { search } : undefined);
      // Backend may return array directly or { data: [...] }
      return Array.isArray(res) ? res : (res as any).data ?? [];
    },
    staleTime: 30_000,
  });
}
