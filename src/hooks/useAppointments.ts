import { useQuery } from "@tanstack/react-query";
import { consultasApi, type Consulta } from "@/lib/api";

export function useAppointments(params?: { date?: string; status?: string }) {
  return useQuery<Consulta[]>({
    queryKey: ["appointments", params],
    queryFn: () => consultasApi.list(params),
    staleTime: 30_000,
  });
}
