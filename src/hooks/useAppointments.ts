import { useQuery } from "@tanstack/react-query";
import { consultasApi, type Consulta } from "@/lib/api";
import { useScope } from "@/contexts/ScopeContext";

export function useAppointments(params?: Record<string, string>) {
  const { scope } = useScope();
  return useQuery<Consulta[]>({
    queryKey: ["appointments", scope, params],
    queryFn: () => consultasApi.list(params),
    staleTime: 30_000,
  });
}
